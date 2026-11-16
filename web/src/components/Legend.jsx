// Explains every line and mark on the timeline.
import Link from "../model/Link.js";
import { COLORS } from "./theme.js";

// What each link type means, in the order a case usually moves.
const LINK_MEANINGS = [
  ["regular relation", "one event follows from another"],
  ["investigative authorization process", "asking for / granting permission to investigate officials"],
  ["criminal investigation", "the prosecutor's investigation"],
  ["criminal case", "the trial in court"],
  ["decision of lack of jurisdiction and venue", "a court or office sends the file elsewhere"],
  ["appeal process", "appeal to a higher court"],
  ["extension of the same event", "several things on the same day"],
];

export default function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", marginTop: 10, fontSize: 12.5,
                  color: COLORS.muted }}>
      {LINK_MEANINGS.map(([label, meaning]) => {
        const s = Link.STYLES[label];
        return (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="10">
              <line x1="0" x2="34" y1="5" y2="5" stroke={s.stroke} strokeWidth={s.width + 0.5}
                    strokeDasharray={s.dash} />
            </svg>
            <span><span style={{ color: COLORS.text }}>{label}</span>: {meaning}</span>
          </span>
        );
      })}
      <Mark color={COLORS.node} fill={COLORS.node}>event</Mark>
      <Mark color={COLORS.family} fill={COLORS.node}>family intervention (always above the main line)</Mark>
      <Mark color={COLORS.node} fill={COLORS.node} big>key event</Mark>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="10" height="14"><line x1="5" x2="5" y1="0" y2="14" stroke={COLORS.murder} strokeDasharray="2 3" /></svg>
        <span style={{ color: COLORS.text }}>19.01.2007</span>: the murder
      </span>
    </div>
  );
}

// One diamond sample in the legend.
function Mark({ color, fill, big, children }) {
  const r = big ? 5.5 : 4;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="16" height="16">
        <rect x={8 - r} y={8 - r} width={r * 2} height={r * 2} transform="rotate(45 8 8)"
              fill={fill} stroke={color} strokeWidth="1.5" />
      </svg>
      <span style={{ color: COLORS.text }}>{children}</span>
    </span>
  );
}