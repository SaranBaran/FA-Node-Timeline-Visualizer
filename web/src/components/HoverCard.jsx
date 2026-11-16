// The little card that follows the mouse over an event.
import { COLORS } from "./theme.js";

const CARD_W = 340;

export default function HoverCard({ node, data, mouseX, mouseY }) {
  // Show the card right of and below the mouse, but flip it if it would leave the window.
  const left = mouseX + 16 + CARD_W > window.innerWidth ? mouseX - 16 - CARD_W : mouseX + 16;
  const top = Math.min(mouseY + 16, window.innerHeight - 320);

  const incoming = data.linksTo(node.id);
  const outgoing = data.linksFrom(node.id);
  const description = node.description.length > 320
    ? node.description.slice(0, 319) + "…" : node.description;

  return (
    <div style={{
      position: "fixed", left, top, width: CARD_W, zIndex: 10, pointerEvents: "none",
      background: "#262626", color: COLORS.text, border: `1px solid ${COLORS.border}`,
      borderRadius: 8, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.45,
      boxShadow: "0 8px 24px rgba(0,0,0,.45)",
    }}>
      <div style={{ color: COLORS.muted, fontSize: 11 }}>{node.id} · {node.dateLabel}</div>
      <div style={{ fontWeight: 600, fontSize: 14, margin: "2px 0 6px" }}>{node.title || "(no title)"}</div>

      {(node.familyIntervention || node.special) && (
        <div style={{ marginBottom: 6 }}>
          {node.familyIntervention && <Tag color={COLORS.family}>family intervention</Tag>}
          {node.special && <Tag color="#a78bfa">key event</Tag>}
        </div>
      )}

      <Row label="Where">{[node.institution, node.city].filter(Boolean).join(", ") || "—"}</Row>
      {node.suspects.length > 0 && <Row label="Suspects">{node.suspects.join(", ")}</Row>}
      {node.cases.length > 0 && <Row label="Cases">{node.cases.join("; ")}</Row>}
      <Row label="Links">{incoming.length} in · {outgoing.length} out</Row>

      {description && <p style={{ margin: "8px 0 0", color: "#d4d4d4" }}>{description}</p>}
      <div style={{ marginTop: 8, color: COLORS.muted, fontSize: 11 }}>Click for full details</div>
    </div>
  );
}

// One "label: value" line in the card.
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: COLORS.muted, width: 62, flex: "none" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

// A small outlined tag, like "family intervention".
function Tag({ color, children }) {
  return (
    <span style={{ display: "inline-block", border: `1px solid ${color}`, color, borderRadius: 4,
                   padding: "0 6px", marginRight: 6, fontSize: 11 }}>
      {children}
    </span>
  );
}