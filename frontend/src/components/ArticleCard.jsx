import { useState } from "react";
import BiasBar, { scoreColor, scoreLabel } from "./BiasBar.jsx";

export default function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);

  const {
    title, outlet, url, published_at, author,
    overall_score, headline_score, body_score,
    headline_explanation, body_explanation,
    author_pattern_note, cross_outlet_note,
  } = article;

  const color = scoreColor(overall_score);
  const badge = scoreLabel(overall_score);

  const pubDate = published_at
    ? new Date(published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4, display: "block", marginBottom: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = color}
            onMouseLeave={e => e.currentTarget.style.color = ""}
          >
            {title}
          </a>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
              background: "var(--surface2)", color: "var(--text-dim)",
              padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500,
            }}>
              {outlet}
            </span>
            {author && (
              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>by {author}</span>
            )}
            {pubDate && (
              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{pubDate}</span>
            )}
          </div>
        </div>

        <div style={{
          flexShrink: 0, textAlign: "center",
          background: "var(--surface2)", border: `1px solid ${color}40`,
          borderRadius: 8, padding: "8px 12px", minWidth: 72,
        }}>
          <div style={{ color, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
            {overall_score > 0 ? "+" : ""}{overall_score?.toFixed(1)}
          </div>
          <div style={{ color, fontSize: 10, marginTop: 3, fontWeight: 500 }}>{badge}</div>
        </div>
      </div>

      <BiasBar score={overall_score} />

      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          background: "none", color: "var(--text-dim)", fontSize: 12,
          padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <ScoreRow label="Headline" score={headline_score} explanation={headline_explanation} />
          <ScoreRow label="Article Body" score={body_score} explanation={body_explanation} />

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
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>
          {score > 0 ? "+" : ""}{score?.toFixed(1)} — {scoreLabel(score)}
        </span>
      </div>
      <BiasBar score={score} size="sm" label={false} />
      {explanation && (
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          {explanation}
        </p>
      )}
    </div>
  );
}

function NoteBox({ icon, label, note }) {
  return (
    <div style={{
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "10px 12px",
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{note}</p>
    </div>
  );
}
