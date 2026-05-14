import { useState } from "react";
import BiasBar, { scoreColor, scoreLabel, scoreBgColor } from "./BiasBar.jsx";

export default function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);

  const {
    title, outlet, url, published_at, author,
    overall_score, headline_score, body_score,
    headline_explanation, body_explanation,
    author_pattern_note, cross_outlet_note,
    biased_quotes: biasedQuotesRaw,
  } = article;

  const biasedQuotes = (() => {
    try { return JSON.parse(biasedQuotesRaw || "[]"); }
    catch { return []; }
  })();

  const color = scoreColor(overall_score);
  const badge = scoreLabel(overall_score);
  const bgColor = scoreBgColor(overall_score);

  const pubDate = published_at
    ? new Date(published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const displayUrl = url ? (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url; }
  })() : null;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: "var(--shadow)",
      transition: "box-shadow 0.15s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.45, display: "block", marginBottom: 8, color: "var(--text)" }}
            onMouseEnter={e => { e.currentTarget.style.color = color; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text)"; }}
          >
            {title}
          </a>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
              background: "var(--accent)",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}>
              {outlet}
            </span>
            {author && (
              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>by {author}</span>
            )}
            {pubDate && (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{pubDate}</span>
            )}
            {displayUrl && url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                ↗ {displayUrl}
              </a>
            )}
          </div>
        </div>

        <div style={{
          flexShrink: 0,
          textAlign: "center",
          background: bgColor,
          border: `1px solid ${color}30`,
          borderRadius: 8,
          padding: "10px 14px",
          minWidth: 96,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            margin: "0 auto 6px",
          }} />
          <div style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1.2 }}>
            {badge}
          </div>
        </div>
      </div>

      <BiasBar score={overall_score} />

      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          background: "none",
          color: "var(--text-dim)",
          fontSize: 12,
          padding: 0,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s", fontSize: 10 }}>▶</span>
        {expanded ? "Hide analysis" : "Show analysis"}
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <ScoreRow label="Headline" score={headline_score} explanation={headline_explanation} />
          <ScoreRow label="Article Body" score={body_score} explanation={body_explanation} />

          {biasedQuotes.length > 0 && (
            <RewriteSuggestions quotes={biasedQuotes} />
          )}

          {author_pattern_note && (
            <NoteBox icon="✍️" label={`Author pattern${author ? ` — ${author}` : ""}`} note={author_pattern_note} />
          )}
          {cross_outlet_note && (
            <NoteBox icon="🔀" label="Cross-outlet comparison" note={cross_outlet_note} />
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRow({ label, score, explanation }) {
  const color = scoreColor(score);
  const bgColor = scoreBgColor(score);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{label}</span>
        <span style={{
          color,
          fontWeight: 700,
          fontSize: 12,
          background: bgColor,
          border: `1px solid ${color}25`,
          padding: "2px 8px",
          borderRadius: 4,
        }}>
          {scoreLabel(score)}
        </span>
      </div>
      <BiasBar score={score} size="sm" label={false} />
      {explanation && (
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
          {explanation}
        </p>
      )}
    </div>
  );
}

function RewriteSuggestions({ quotes }) {
  return (
    <div style={{
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "8px 14px",
        borderBottom: "1px solid var(--border)",
        fontWeight: 600,
        fontSize: 11,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        ✏️ Rewrite Suggestions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {quotes.map((q, i) => (
          <div key={i} style={{
            padding: "12px 14px",
            borderBottom: i < quotes.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{
              background: "#fff8e1",
              border: "1px solid #fde68a",
              borderLeft: "3px solid #f59e0b",
              borderRadius: 4,
              padding: "7px 10px",
              fontSize: 13,
              color: "#78350f",
              lineHeight: 1.5,
              marginBottom: 7,
              fontStyle: "italic",
            }}>
              "{q.original}"
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 7, lineHeight: 1.5 }}>
              {q.explanation}
            </p>
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderLeft: "3px solid #22c55e",
              borderRadius: 4,
              padding: "7px 10px",
              fontSize: 13,
              color: "#14532d",
              lineHeight: 1.5,
            }}>
              "{q.rewrite}"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBox({ icon, label, note }) {
  return (
    <div style={{
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "12px 14px",
    }}>
      <div style={{ fontWeight: 600, fontSize: 11, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {icon} {label}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "var(--text-dim)" }}>{note}</p>
    </div>
  );
}
