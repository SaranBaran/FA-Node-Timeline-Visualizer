// A side panel, fixed to the right edge of the window, with everything about the clicked event.
import { COLORS } from "./theme.js";

export const PANEL_W = 380;   // App leaves this much room on the right while the panel is open

// chain: {number, total} while "Show where it leads" is running, otherwise null.
export default function DetailPanel({ node, data, onClose, onSelect, onZoom, chain }) {
  const linkList = (links, end) =>
    links.map((l) => {
      const other = data.get(l[end]);
      return (
        <li key={l.key} style={{ marginBottom: 6 }}>
          <button onClick={() => onSelect(l[end])} style={{ marginRight: 6 }}>{l[end]}</button>
          {other?.title} <span style={{ color: COLORS.muted }}>({l.label ?? "no label"})</span>
        </li>
      );
    });

  const incoming = data.linksTo(node.id);
  const outgoing = data.linksFrom(node.id);

  return (
    <aside style={{
      position: "fixed", top: 0, right: 0,          // stuck to the right edge of the window
      width: PANEL_W, height: "100vh",              // full window height
      overflowY: "auto",                            // long text scrolls inside the panel
      boxSizing: "border-box", padding: 16,
      background: COLORS.bg, borderLeft: `1px solid ${COLORS.border}`,
      boxShadow: "-6px 0 18px rgba(0,0,0,0.4)",
      zIndex: 20,                                   // above the timeline
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{node.id} · {node.title || "(no title)"}</h2>
        <button onClick={onClose} title="Close">✕</button>
      </div>

      {chain && (
        <div style={{ marginTop: 10, padding: "4px 8px", borderRadius: 4, fontSize: 12,
                      border: `1px solid ${COLORS.selected}`, color: COLORS.selected }}>
          Following the chain · event {chain.number} of {chain.total}
        </div>
      )}

      <p style={{ color: COLORS.muted }}>
        <strong style={{ color: COLORS.text }}>{node.dateLabel}</strong>
        {node.institution && ` · ${node.institution}`}{node.city && `, ${node.city}`}
      </p>

      <button onClick={() => onZoom(node.id)}>🔍 Zoom to this event</button>

      <h3 style={{ marginBottom: 4 }}>{node.cases.length > 1 ? "Cases" : "Case"}</h3>
      {node.cases.length
        ? <ul style={{ paddingLeft: 18, margin: 0 }}>{node.cases.map((c) => <li key={c}>{c}</li>)}</ul>
        : <p style={{ margin: 0, color: COLORS.muted, fontStyle: "italic" }}>no case given</p>}

      <h3 style={{ marginBottom: 4 }}>Suspects</h3>
      {node.suspects.length
        ? <ul style={{ paddingLeft: 18, margin: 0 }}>{node.suspects.map((s) => <li key={s}>{s}</li>)}</ul>
        : <p style={{ margin: 0, color: COLORS.muted, fontStyle: "italic" }}>none named</p>}

      <h3 style={{ marginBottom: 4 }}>Description</h3>
      <p style={{ marginTop: 0, lineHeight: 1.5 }}>{node.description || "—"}</p>

      {incoming.length > 0 && <><h3>Comes from</h3><ul style={{ paddingLeft: 18 }}>{linkList(incoming, "source")}</ul></>}
      {outgoing.length > 0 && <><h3>Leads to</h3><ul style={{ paddingLeft: 18 }}>{linkList(outgoing, "target")}</ul></>}
    </aside>
  );
}