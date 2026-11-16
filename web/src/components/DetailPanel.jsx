// The panel under the timeline with everything about the clicked event.
import { COLORS } from "./theme.js";

export default function DetailPanel({ node, data, onClose, onSelect }) {
  // A list of linked events; each has a button that jumps to it.
  const linkList = (links, end) =>
    links.map((l) => {
      const other = data.get(l[end]);
      return (
        <li key={l.key}>
          <button onClick={() => onSelect(l[end])} style={{ marginRight: 6 }}>{l[end]}</button>
          {other?.title} <span style={{ color: COLORS.muted }}>({l.label ?? "no label"})</span>
        </li>
      );
    });

  const incoming = data.linksTo(node.id);
  const outgoing = data.linksFrom(node.id);

  return (
    <aside style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, marginTop: 12,
                    background: COLORS.bg }}>
      <h2 style={{ marginTop: 0 }}>{node.id} · {node.title || "(no title)"}</h2>
      <p>
        <strong>{node.dateLabel}</strong>
        {node.institution && ` · ${node.institution}`}
        {node.city && `, ${node.city}`}
      </p>
      <p>{node.description}</p>
      {node.suspects.length > 0 && <p>Suspects: {node.suspects.join(", ")}</p>}
      {node.cases.length > 0 && <p>Cases: {node.cases.join("; ")}</p>}

      {incoming.length > 0 && (<><h3>Comes from</h3><ul>{linkList(incoming, "source")}</ul></>)}
      {outgoing.length > 0 && (<><h3>Leads to</h3><ul>{linkList(outgoing, "target")}</ul></>)}

      <button onClick={onClose}>Close</button>
    </aside>
  );
}