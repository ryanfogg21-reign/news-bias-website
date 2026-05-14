/**
 * Horizontal bias bar from -5 (left/blue) to +5 (right/red).
 * `score` is clamped to [-5, 5].
 */
export default function BiasBar({ score, label = true, size = "md" }) {
  const clamped = Math.max(-5, Math.min(5, score ?? 0));
  // Convert [-5,5] to [0,100]%
  const pct = ((clamped + 5) / 10) * 100;

  const color = scoreColor(clamped);
  const height = size === "sm" ? 6 : 10;
  const dotSize = size === "sm" ? 12 : 16;

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: "var(--text-dim)" }}>
          <span>← Left</span>
          <span style={{ color, fontWeight: 700, fontSize: 13 }}>
            {clamped > 0 ? "+" : ""}{clamped.toFixed(1)}
          </span>
          <span>Right →</span>
        </div>
      )}
      <div style={{
        position: "relative",
        height,
        borderRadius: height,
        background: "linear-gradient(to right, #1565c0, #64b5f6, #4caf50, #ff7043, #b71c1c)",
        overflow: "visible",
      }}>
        {/* center tick */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 2,
          height: "100%",
          background: "rgba(255,255,255,0.3)",
          transform: "translateX(-50%)",
        }} />
        {/* score dot */}
        <div style={{
          position: "absolute",
          left: `${pct}%`,
          top: "50%",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: color,
          border: "2px solid #fff",
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 8px ${color}`,
          transition: "left 0.3s ease",
        }} />
      </div>
    </div>
  );
}

export function scoreColor(score) {
  if (score <= -3) return "#1565c0";
  if (score <= -1) return "#64b5f6";
  if (score < 1)  return "#4caf50";
  if (score < 3)  return "#ff7043";
  return "#b71c1c";
}

export function scoreLabel(score) {
  if (score <= -3) return "Strong Left";
  if (score <= -1) return "Lean Left";
  if (score < 1)  return "Center";
  if (score < 3)  return "Lean Right";
  return "Strong Right";
}
