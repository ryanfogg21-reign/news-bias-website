export default function BiasBar({ score, label = true, size = "md" }) {
  const clamped = Math.max(-5, Math.min(5, score ?? 0));
  const pct = ((clamped + 5) / 10) * 100;

  const color = scoreColor(clamped);
  const height = size === "sm" ? 5 : 8;
  const dotSize = size === "sm" ? 11 : 14;

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span>Left</span>
          <span style={{ color, fontWeight: 700, fontSize: 12, textTransform: "none", letterSpacing: 0 }}>
            {scoreLabel(clamped)}
          </span>
          <span>Right</span>
        </div>
      )}
      <div style={{
        position: "relative",
        height,
        borderRadius: height,
        background: "linear-gradient(to right, #1a4f9f, #3b82f6, #059669, #ea7316, #c8202a)",
        overflow: "visible",
      }}>
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 1,
          height: "100%",
          background: "rgba(255,255,255,0.5)",
          transform: "translateX(-50%)",
        }} />
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
          boxShadow: `0 1px 4px rgba(0,0,0,0.25), 0 0 0 1px ${color}40`,
          transition: "left 0.3s ease",
        }} />
      </div>
    </div>
  );
}

export function scoreColor(score) {
  if (score <= -3) return "#1a4f9f";
  if (score <= -1) return "#3b82f6";
  if (score < 1)  return "#059669";
  if (score < 3)  return "#ea7316";
  return "#c8202a";
}

export function scoreLabel(score) {
  if (score <= -3) return "Strong Left";
  if (score <= -1) return "Lean Left";
  if (score < 1)  return "Center";
  if (score < 3)  return "Lean Right";
  return "Strong Right";
}

export function scoreBgColor(score) {
  if (score <= -3) return "#eff6ff";
  if (score <= -1) return "#f0f9ff";
  if (score < 1)  return "#f0fdf4";
  if (score < 3)  return "#fff7ed";
  return "#fef2f2";
}
