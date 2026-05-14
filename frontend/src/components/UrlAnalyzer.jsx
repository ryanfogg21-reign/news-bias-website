import { useState } from "react";
import ArticleCard from "./ArticleCard.jsx";

export default function UrlAnalyzer({ apiBase, onArticleFound }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState(null); // null | 'loading' | 'found' | 'new' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiBase}/api/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setStatus(data.status === "existing" ? "found" : "new");
      setResult(data.article);
      if (onArticleFound) onArticleFound(data.article, data.status);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Could not analyze article. Check the URL and try again.");
    }
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "20px 22px",
      marginBottom: 20,
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
          Analyze an Article
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Paste any news article URL to get an AI-powered political bias analysis.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.example.com/politics/article..."
          disabled={status === "loading"}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !url.trim()}
          style={{
            background: status === "loading" ? "var(--surface2)" : "var(--accent)",
            color: status === "loading" ? "var(--text-muted)" : "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: "1px solid transparent",
            transition: "all 0.15s",
            minWidth: 110,
          }}
        >
          {status === "loading" ? "Analyzing…" : "Analyze →"}
        </button>
      </form>

      {status === "error" && (
        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: 6,
          color: "#b91c1c",
          fontSize: 13,
        }}>
          {errorMsg}
        </div>
      )}

      {(status === "found" || status === "new") && result && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: status === "found" ? "#eff6ff" : "#f0fdf4",
            color: status === "found" ? "#1e40af" : "#15803d",
            border: `1px solid ${status === "found" ? "#bfdbfe" : "#bbf7d0"}`,
          }}>
            {status === "found" ? "✓ Already in database — showing existing analysis" : "✨ New analysis complete"}
          </div>
          <ArticleCard article={result} />
        </div>
      )}
    </div>
  );
}
