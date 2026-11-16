// A link between two events. Mirrors the Edge dataclass in scripts/model.py.
export default class Link {
  // Line style per link type, following the Miro legend.
  static STYLES = {
    "regular relation":                           { stroke: "#9ca3af", dash: null,  width: 1 },
    "investigative authorization process":        { stroke: "#facc15", dash: "5 4", width: 1.5 },
    "criminal investigation":                     { stroke: "#f5f5f5", dash: "5 4", width: 1.5 },
    "criminal case":                              { stroke: "#f5f5f5", dash: null,  width: 2 },
    "decision of lack of jurisdiction and venue": { stroke: "#8b5cf6", dash: "5 4", width: 1.5 },
    "extension of the same event":                { stroke: "#60a5fa", dash: "2 3", width: 1 },
    "appeal process":                             { stroke: "#22c55e", dash: "5 4", width: 1.5 },
  };
  static UNKNOWN_STYLE = { stroke: "#6b7280", dash: "2 4", width: 1 };

  constructor(raw) {
    this.source = String(raw.source ?? "").trim().toUpperCase();
    this.target = String(raw.target ?? "").trim().toUpperCase();
    this.label = raw.label ?? null;
  }

  get key() { return `${this.source}->${this.target}`; }
  get style() { return Link.STYLES[this.label] ?? Link.UNKNOWN_STYLE; }
}