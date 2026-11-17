// Explains every line and mark on the timeline, in the words of the Miro legend
// (Legend_for_Miro, Nov 2026). Lines come from Link.STYLES and marks from EventMark,
// so the legend can never show something different from the timeline.
import Link from "../model/Link.js";
import EventMark from "./EventMark.jsx";
import { COLORS } from "./theme.js";

// [link label in the spreadsheet, stage name on Miro, meaning]
const LINES = [
  ["investigative authorization process", "Preliminary examination / administrative inspection",
   "the inspection and the process for getting permission to investigate public officials"],
  ["criminal investigation", "Investigation", "criminal investigation in progress"],
  ["criminal case", "Trial", "trial proceedings"],
  ["decision of lack of jurisdiction and venue", "Lack of jurisdiction",
   "proceedings interrupted while the jurisdiction question is resolved"],
  ["appeal process", "Supreme Court (Yargıtay)", "appeal proceedings before the Supreme Court"],
  ["regular relation", "Connecting line", "a relationship or causal connection between events"],
  ["extension of the same event", "Same-day part", "another part of the same event, on the same day"],
];

// [mark kind, name, meaning]
const MARKS = [
  ["event", "Event", "a step in the proceedings"],
  ["key", "Turning point", "an event that changed the course of the proceedings"],
  ["family", "Dink family", "an intervention, request, objection or complaint by the family"],
  ["part", "Same-day part", "hangs under the event it belongs to"],
];

export default function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 40px", marginTop: 12, fontSize: 12.5,
                  color: COLORS.muted }}>
      <Section title="Lines: which process">
        {LINES.map(([label, name, meaning]) => {
          const s = Link.STYLES[label];
          return (
            <Item key={label} name={name} meaning={meaning}>
              <svg width="34" height="10">
                <line x1="0" x2="34" y1="5" y2="5" stroke={s.stroke} strokeWidth={s.width + 0.5}
                      strokeDasharray={s.dash} />
              </svg>
            </Item>
          );
        })}
      </Section>

      <Section title="Marks: which kind of event">
        {MARKS.map(([kind, name, meaning]) => (
          <Item key={kind} name={name} meaning={meaning}>
            <svg width="34" height="18"><EventMark kind={kind} x={17} y={9} /></svg>
          </Item>
        ))}
        <Item name="19.01.2007" meaning="the murder of Hrant Dink">
          <svg width="34" height="18">
            <line x1="17" x2="17" y1="0" y2="18" stroke={COLORS.murder} strokeDasharray="2 3" />
          </svg>
        </Item>
        <Item name="Shaded strip" meaning="the same-day parts of a lane">
          <svg width="34" height="18"><rect x="0" y="3" width="34" height="12" fill={COLORS.muted} fillOpacity="0.15" /></svg>
        </Item>
      </Section>
    </div>
  );
}

// A titled column of legend rows.
function Section({ title, children }) {
  return (
    <div>
      <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gap: 4 }}>{children}</div>
    </div>
  );
}

// One legend row: a sample, a name, and what it means.
function Item({ name, meaning, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {children}
      <span><span style={{ color: COLORS.text }}>{name}</span>: {meaning}</span>
    </div>
  );
}