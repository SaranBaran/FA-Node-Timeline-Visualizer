// A directed link between two events. Mirrors the Edge dataclass in scripts/model.py.
// Colours and dashes follow the Miro legend (Legend_for_Miro, Nov 2026).
export default class Link {
  static STYLES = {
    "regular relation":                           { stroke: "#9ca3af", dash: null,  width: 1 },   // thin connecting line
    "investigative authorization process":        { stroke: "#facc15", dash: "5 4", width: 1.5 }, // yellow dashed
    "criminal investigation":                     { stroke: "#f5f5f5", dash: "5 4", width: 1.5 }, // white dashed
    "criminal case":                              { stroke: "#f5f5f5", dash: null,  width: 2 },   // white solid
    "decision of lack of jurisdiction and venue": { stroke: "#8b5cf6", dash: "5 4", width: 1.5 }, // purple dashed
    "extension of the same event":                { stroke: "#9ca3af", dash: "1 3", width: 1 },   // grey dotted
    "appeal process":                             { stroke: "#22d3ee", dash: null,  width: 2 },   // light blue solid (Yargıtay)
  };
  static EXTENSION = "extension of the same event";
  static UNKNOWN_STYLE = { stroke: "#6b7280", dash: "2 4", width: 1 };

  constructor(raw) {
    this.source = String(raw.source ?? "").trim().toUpperCase();
    this.target = String(raw.target ?? "").trim().toUpperCase();
    this.label = raw.label ?? null;
  }

  get key() { return `${this.source}->${this.target}`; }
  get style() { return Link.STYLES[this.label] ?? Link.UNKNOWN_STYLE; }

  // True when the target is only another part of the same event (same day), not a new step.
  get isExtension() { return this.label === Link.EXTENSION; }
}