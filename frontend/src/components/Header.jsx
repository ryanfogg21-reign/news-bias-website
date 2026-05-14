export default function Header({ stats, onRefresh, refreshing }) {
  return (
    <header style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>
          News Bias Analyzer
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
          AI-scored political bias across major outlets
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {stats && (
          <div style={{ display: "flex", gap: 16 }}>
            <Stat label="Articles" value={stats.total_analyzed} />
            {stats.by_outlet?.map(o => (
              <Stat key={o.outlet} label={o.outlet} value={`${o.avg_score >= 0 ? "+" : ""}${o.avg_score?.toFixed(1)}`} />
            ))}
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            background: refreshing ? "var(--surface2)" : "var(--accent)",
            color: "var(--text)",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? "Refreshing…" : "↺ Refresh"}
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
      <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{label}</div>
    </div>
  );
}
