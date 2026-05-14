import { scoreLabel, scoreColor } from "./BiasBar.jsx";

export default function FilterPanel({ outlets, filters, onChange }) {
  const { outlet, minScore, maxScore } = filters;

  return (
    <aside style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 22,
      height: "fit-content",
      position: "sticky",
      top: 16,
      boxShadow: "var(--shadow)",
    }}>
      <h2 style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        Filters
      </h2>

      {/* Outlet */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Outlet
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <OutletBtn label="All Sources" active={!outlet} onClick={() => onChange({ outlet: null })} />
          {outlets.map(o => (
            <OutletBtn key={o} label={o} active={outlet === o} onClick={() => onChange({ outlet: o })} />
          ))}
        </div>
      </div>

      {/* Bias range */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Political Lean
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <RangeInput
            label="From"
            value={scoreLabel(minScore)}
            color={scoreColor(minScore)}
            min={-5} max={5} step={0.5}
            sliderValue={minScore}
            onChange={v => onChange({ minScore: v })}
          />
          <RangeInput
            label="To"
            value={scoreLabel(maxScore)}
            color={scoreColor(maxScore)}
            min={-5} max={5} step={0.5}
            sliderValue={maxScore}
            onChange={v => onChange({ maxScore: v })}
          />
        </div>
        <button
          onClick={() => onChange({ minScore: -5, maxScore: 5 })}
          style={{
            marginTop: 10,
            background: "none",
            color: "var(--text-muted)",
            fontSize: 12,
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Show all
        </button>
      </div>

      {/* Legend */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Scale</p>
        {[
          { label: "Strong Left",  color: "#1a4f9f" },
          { label: "Lean Left",    color: "#3b82f6" },
          { label: "Center",       color: "#059669" },
          { label: "Lean Right",   color: "#ea7316" },
          { label: "Strong Right", color: "#c8202a" },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function OutletBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--accent)" : "var(--surface2)",
        color: active ? "#fff" : "var(--text-dim)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 5,
        padding: "7px 10px",
        fontSize: 13,
        textAlign: "left",
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function RangeInput({ label, value, color, min, max, step, sliderValue, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={sliderValue}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}
