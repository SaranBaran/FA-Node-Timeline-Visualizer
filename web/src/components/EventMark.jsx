// The shape of one event. The timeline and the legend both use this,
// so the legend always shows exactly what the timeline draws.
// Shapes follow the Miro legend (Legend_for_Miro, Nov 2026).
import { COLORS } from "./theme.js";

// What kind of mark an event gets. The first rule that fits wins.
export function markKindOf(node, data) {
  if (node.familyIntervention) return "family";   // red hollow square
  if (data.isExtension(node.id)) return "part";   // grey hollow circle
  if (node.special) return "key";                 // white star
  return "event";                                 // white diamond
}

// A five-pointed star around (x, y).
function starPath(x, y, outer, inner) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

export default function EventMark({ kind, x, y, selected = false }) {
  const outline = selected ? COLORS.selected : null;   // blue outline when clicked
  const width = selected ? 2.5 : 1.5;
  switch (kind) {
    case "family":
      return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} fill={COLORS.bg}
                   stroke={outline ?? COLORS.family} strokeWidth={selected ? 2.5 : 1.8} />;
    case "part":
      return <circle cx={x} cy={y} r={3.5} fill={COLORS.bg} stroke={outline ?? COLORS.muted} strokeWidth={width} />;
    case "key":
      return <path d={starPath(x, y, 7.5, 3.2)} fill={COLORS.node} stroke={outline ?? COLORS.node} strokeWidth={selected ? 2 : 0.5} />;
    default:
      return <rect x={x - 4} y={y - 4} width={8} height={8} transform={`rotate(45 ${x} ${y})`}
                   fill={COLORS.node} stroke={outline ?? COLORS.node} strokeWidth={width} />;
  }
}