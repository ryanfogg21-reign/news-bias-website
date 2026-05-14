import feedparser
import trafilatura
import requests
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Washington Post and Reuters removed — WashPost blocks server scrapers with 90s timeouts,
# Reuters RSS feed currently returns 0 articles.
NEWS_SOURCES = [
    {"name": "Fox News",  "rss": "https://feeds.foxnews.com/foxnews/politics"},
    {"name": "CNN",       "rss": "http://rss.cnn.com/rss/cnn_allpolitics.rss"},
    {"name": "NBC News",  "rss": "https://feeds.nbcnews.com/nbcnews/public/politics"},
    {"name": "ABC News",  "rss": "https://abcnews.go.com/abcnews/politicsheadlines"},
    {"name": "NPR",       "rss": "https://feeds.npr.org/1014/rss.xml"},
    {"name": "CBS News",  "rss": "https://www.cbsnews.com/latest/rss/politics"},
    {"name": "AP News",   "rss": "https://feeds.apnews.com/apf-politics"},
    {"name": "The Hill",  "rss": "https://thehill.com/rss/syndicator/19110"},
    {"name": "Politico",  "rss": "https://rss.politico.com/politics-news.xml"},
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; NewsBiasAnalyzer/1.0)"}


def fetch_article_body(url: str, rss_summary: str = "") -> str:
    """Fetch full article text. Falls back to rss_summary on 403/timeout."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8)
        if resp.status_code == 403:
            # Site blocks scrapers — use RSS summary instead of hanging
            return rss_summary
        resp.raise_for_status()
        text = trafilatura.extract(resp.text, include_comments=False, include_tables=False)
        if text and len(text) > 100:
            return text[:8000]
    except Exception as e:
        logger.debug("Body fetch failed for %s: %s", url, e)
    return rss_summary


def _rss_summary(entry) -> str:
    """Extract plain-text summary from an RSS entry."""
    for field in ("summary", "description", "content"):
        val = getattr(entry, field, None)
        if isinstance(val, list) and val:
            val = val[0].get("value", "")
        if val:
            # Strip basic HTML tags
            import re
            return re.sub(r"<[^>]+>", "", str(val)).strip()[:1000]
    return ""


def fetch_feed(source: dict, max_articles: int = 10) -> list[dict]:
    articles = []
    try:
        feed = feedparser.parse(source["rss"])
        now = datetime.now(timezone.utc).isoformat()

        for entry in feed.entries[:max_articles]:
            url = entry.get("link", "")
            if not url:
                continue

            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                except Exception:
                    pass

            author = None
            if hasattr(entry, "author") and entry.author:
                author = entry.author.strip()
            elif hasattr(entry, "authors") and entry.authors:
                author = entry.authors[0].get("name", "").strip() or None

            summary = _rss_summary(entry)
            body = fetch_article_body(url, rss_summary=summary)

            articles.append({
                "url": url,
                "title": entry.get("title", "").strip(),
                "outlet": source["name"],
                "author": author,
                "published_at": published_at,
                "body": body or summary,  # always store at least the RSS summary
                "fetched_at": now,
            })
    except Exception as e:
        logger.error("Error fetching feed %s: %s", source["name"], e)

    return articles


def fetch_all_feeds(max_articles_per_source: int = 10) -> list[dict]:
    all_articles = []
    for source in NEWS_SOURCES:
        logger.info("Fetching %s...", source["name"])
        articles = fetch_feed(source, max_articles_per_source)
        logger.info("  Got %d articles from %s", len(articles), source["name"])
        all_articles.extend(articles)
    return all_articles
