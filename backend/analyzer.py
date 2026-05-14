import json
import logging
import os
from datetime import datetime, timezone

from groq import Groq

logger = logging.getLogger(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"

BIAS_TOOL = {
    "type": "function",
    "function": {
        "name": "report_bias",
        "description": "Report political bias scores for a news article's headline and body.",
        "parameters": {
            "type": "object",
            "properties": {
                "headline_score": {
                    "type": "number",
                    "description": "Political bias of the headline: -5 (very left-leaning) to +5 (very right-leaning), 0 = neutral.",
                },
                "body_score": {
                    "type": "number",
                    "description": "Political bias of the article body: -5 to +5, 0 = neutral.",
                },
                "headline_explanation": {
                    "type": "string",
                    "description": "1-2 sentences explaining the headline bias score.",
                },
                "body_explanation": {
                    "type": "string",
                    "description": "1-2 sentences explaining the body bias score.",
                },
                "author_pattern_note": {
                    "type": "string",
                    "description": "If author comparison data was provided: 1-2 sentences noting whether this article aligns with or diverges from the author's typical bias pattern. Null if no author data was available.",
                },
                "cross_outlet_note": {
                    "type": "string",
                    "description": "If cross-outlet data was provided: 1-2 sentences comparing how this outlet framed the story vs other outlets. Null if no cross-outlet data was available.",
                },
            },
            "required": [
                "headline_score", "body_score",
                "headline_explanation", "body_explanation",
                "author_pattern_note", "cross_outlet_note",
            ],
        },
    },
}

SYSTEM_PROMPT = """You are an objective political bias analyst. Evaluate news content on:
- Word choice and framing (loaded vs neutral language)
- Which facts, quotes, or perspectives are emphasized or omitted
- Tone toward political figures, parties, and policies
- Whether criticism is applied evenly across the political spectrum
- Rhetorical structure and emotional appeals

Score with precision. Most articles fall between -3 and +3.
Reserve -5 / +5 for extreme cases only. Do not factor in the outlet's
general reputation — judge only the specific text provided."""


def _format_author_context(author_articles: list[dict]) -> str:
    if not author_articles:
        return ""
    lines = [f'  - "{a["title"]}" ({a["outlet"]}) → score: {_fmt(a["overall_score"])}' for a in author_articles]
    scores = [a["overall_score"] for a in author_articles if a["overall_score"] is not None]
    avg = sum(scores) / len(scores) if scores else 0
    return (
        f"\nAUTHOR COMPARISON — other articles by this author:\n"
        + "\n".join(lines)
        + f"\n  Author's average score across {len(scores)} article(s): {_fmt(avg)}\n"
    )


def _format_cross_outlet_context(similar_articles: list[dict]) -> str:
    if not similar_articles:
        return ""
    lines = [f'  - {a["outlet"]}: "{a["title"]}" → score: {_fmt(a["overall_score"])}' for a in similar_articles]
    return (
        "\nCROSS-OUTLET COMPARISON — other outlets covering a similar story:\n"
        + "\n".join(lines)
        + "\n"
    )


def _fmt(score) -> str:
    if score is None:
        return "N/A"
    return f"{'+' if score > 0 else ''}{score:.1f}"


def analyze_article(title: str, body: str, author: str = None,
                    author_articles: list[dict] = None,
                    similar_articles: list[dict] = None) -> dict | None:
    if not title:
        return None

    content = body.strip() if body else "(no body — analyze headline only)"
    author_ctx = _format_author_context(author_articles or [])
    outlet_ctx = _format_cross_outlet_context(similar_articles or [])

    has_author_data = bool(author_articles)
    has_outlet_data = bool(similar_articles)

    author_line = f"Author: {author}" if author else ""
    author_instruction = (
        "Use the author comparison data above to note whether this article aligns with "
        "or diverges from the typical pattern for this author."
        if has_author_data else
        "No author history is available. Set author_pattern_note to null."
    )
    outlet_instruction = (
        "Use the cross-outlet data above to compare how this outlet framed the story versus others."
        if has_outlet_data else
        "No cross-outlet data is available. Set cross_outlet_note to null."
    )

    user_msg = f"""Analyze this article for political bias.

Scale: -5 = very left-leaning  |  0 = neutral  |  +5 = very right-leaning

Headline: {title}
{author_line}

Article body:
{content[:4000]}
{author_ctx}{outlet_ctx}
{author_instruction}
{outlet_instruction}"""

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=600,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            tools=[BIAS_TOOL],
            tool_choice={"type": "function", "function": {"name": "report_bias"}},
        )

        tool_call = completion.choices[0].message.tool_calls
        if not tool_call:
            logger.warning("No tool call in Groq response for: %s", title[:60])
            return None

        result = json.loads(tool_call[0].function.arguments)

        return {
            "headline_score": round(max(-5.0, min(5.0, float(result["headline_score"]))), 2),
            "body_score": round(max(-5.0, min(5.0, float(result["body_score"]))), 2),
            "overall_score": round(
                max(-5.0, min(5.0, (float(result["headline_score"]) + float(result["body_score"])) / 2)), 2
            ),
            "headline_explanation": result.get("headline_explanation", ""),
            "body_explanation": result.get("body_explanation", ""),
            "author_pattern_note": result.get("author_pattern_note") or None,
            "cross_outlet_note": result.get("cross_outlet_note") or None,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error("Error analyzing '%s': %s", title[:60], e)
        return None
