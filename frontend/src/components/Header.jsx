import { scoreLabel, scoreColor } from "./BiasBar.jsx";

export default function Header({ stats, onRefresh, refreshing }) {
  return (
    <header style={{
      background: "var(--header-bg)",
      borderBottom: "1px solid var(--header-border)",
      padding: "0 24px",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--header-text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ color: "#3b82f6" }}>⚖</span> NewsLean
          </h1>
          <p style={{ color: "var(--header-dim)", fontSize: 12, marginTop: 1 }}>
            AI-powered political bias analysis across major news outlets
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {stats && (
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <Stat label="Analyzed" value={stats.total_analyzed} />
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: refreshing ? "rgba(255,255,255,0.08)" : "#1e3a5f",
              color: refreshing ? "var(--header-dim)" : "#fff",
              padding: "8px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "all 0.15s",
              letterSpacing: "0.01em",
            }}
          >
            {refreshing ? "Refreshing…" : "↺ Refresh Feeds"}
          </button>
        </div>
      </div>

      {/* Outlet bias strip */}
      {stats?.by_outlet?.length > 0 && (
        <div style={{
          display: "flex",
          gap: 6,
          paddingBottom: 12,
          flexWrap: "wrap",
        }}>
          {stats.by_outlet.map(o => {
            const color = scoreColor(o.avg_score ?? 0);
            const label = scoreLabel(o.avg_score ?? 0);
            return (
              <div key={o.outlet} style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 5,
                padding: "4px 10px",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--header-dim)" }}>{o.outlet}</span>
                <span style={{ color, fontWeight: 700, marginLeft: 6 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--header-text)" }}>{value}</div>
      <div style={{ color: "var(--header-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
