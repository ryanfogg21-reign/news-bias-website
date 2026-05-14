export default function FilterPanel({ outlets, filters, onChange }) {
  const { outlet, minScore, maxScore } = filters;

  return (
    <aside style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 20,
      height: "fit-content",
      position: "sticky",
      top: 16,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>
        Filters
      </h2>

      {/* Outlet */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
          Outlet
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <OutletBtn label="All" active={!outlet} onClick={() => onChange({ outlet: null })} />
          {outlets.map(o => (
            <OutletBtn key={o} label={o} active={outlet === o} onClick={() => onChange({ outlet: o })} />
          ))}
        </div>
      </div>

      {/* Bias range */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
          Bias Range
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <RangeInput
            label={`Min: ${minScore >= 0 ? "+" : ""}${minScore}`}
            min={-5} max={5} step={0.5}
            value={minScore}
            onChange={v => onChange({ minScore: v })}
          />
          <RangeInput
            label={`Max: ${maxScore >= 0 ? "+" : ""}${maxScore}`}
            min={-5} max={5} step={0.5}
            value={maxScore}
            onChange={v => onChange({ maxScore: v })}
          />
        </div>
        <button
          onClick={() => onChange({ minScore: -5, maxScore: 5 })}
          style={{
            marginTop: 8,
            background: "none",
            color: "var(--text-dim)",
            fontSize: 12,
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scale</p>
        {[
          { range: "-5 to -3", label: "Strong Left", color: "#1565c0" },
          { range: "-3 to -1", label: "Lean Left", color: "#64b5f6" },
          { range: "-1 to +1", label: "Center", color: "#4caf50" },
          { range: "+1 to +3", label: "Lean Right", color: "#ff7043" },
          { range: "+3 to +5", label: "Strong Right", color: "#b71c1c" },
        ].map(({ range, label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{range} — {label}</span>
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
        color: active ? "var(--text)" : "var(--text-dim)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 5,
        padding: "6px 10px",
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

function RangeInput({ label, min, max, step, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{label}</div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}
