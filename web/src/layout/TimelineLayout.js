// Works out where everything goes: x from the date, y from the lane and sub-track.
// Knows nothing about React; it only does the geometry.
import * as d3 from "d3";

export default class TimelineLayout {
  static DEFAULT_WIDTH = 1400;  // width of the time axis at zoom 1, if no width is given
  static PAD_X = 30;
  static TOP = 30;
  static ROW = 26;           // between sub-tracks, at row-zoom 1
  static LANE_GAP = 34;      // between lanes, at row-zoom 1
  static MIN_GAP = 9;        // at zoom 1, closer events go on a new sub-track

  // baseWidth = how wide the time axis is at zoom 1 (normally: the width of the screen area)
  constructor(data, grouping, zoomX = 1, zoomY = 1, baseWidth = TimelineLayout.DEFAULT_WIDTH) {
    this.data = data;
    this.grouping = grouping;
    this.width = baseWidth * zoomX;
    this.row = TimelineLayout.ROW * zoomY;
    this.laneGap = TimelineLayout.LANE_GAP * zoomY;

    const dated = data.datedNodes;
    const { PAD_X } = TimelineLayout;
    // The base scale (zoom 1) decides the sub-tracks, so lanes don't jump when zooming.
    this.xBase = d3.scaleUtc().domain(d3.extent(dated, (n) => n.date))
      .range([PAD_X, baseWidth - PAD_X]).nice();
    this.x = this.xBase.copy().range([PAD_X, this.width - PAD_X]);

    this.positions = new Map();   // node id -> {x, y}
    this.lanes = [];              // {name, color, top, height, center, rowsAbove, rowsBelow, ...}
    this.#placeLanes(dated);
  }

  // Inside each lane, from top to bottom:
  //   family interventions (above the main line)
  //   the main line: events that lead on to other events (overflow goes just below it)
  //   extension rows: events that are only another part of an event on the main line
  #placeLanes(dated) {
    // An extension goes in the lane of its main event, so the two stay together.
    const groups = d3.group(dated, (n) => this.grouping.laneOf(this.data.mainEventOf(n)));
    let top = TimelineLayout.TOP;
    for (const name of this.grouping.order(groups.keys(), groups)) {
      const nodes = [...groups.get(name)].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const family = nodes.filter((n) => n.familyIntervention);
      const rest = nodes.filter((n) => !n.familyIntervention);
      const extensions = rest.filter((n) => this.data.isExtension(n.id));
      const main = rest.filter((n) => !this.data.isExtension(n.id));

      const familyTrack = this.#packIntoTracks(family);         // 0 = first row above the main line
      const mainTrack = this.#packIntoTracks(main);             // 0 = the main line, 1+ = just below it
      const extensionTrack = this.#packIntoTracks(extensions);  // 0 = first extension row
      const rowsAbove = TimelineLayout.#count(familyTrack);
      const mainRows = Math.max(1, TimelineLayout.#count(mainTrack));
      const extensionRows = TimelineLayout.#count(extensionTrack);
      const rowsBelow = mainRows - 1 + extensionRows;

      const center = top + this.row / 2 + rowsAbove * this.row;   // y of the main line
      const lane = {
        name, top, center,
        color: this.grouping.colorOf(name, nodes),
        height: (rowsAbove + 1 + rowsBelow) * this.row,
        rowsAbove, rowsBelow, mainRows, extensionRows,
        extensionY: extensionRows ? center + mainRows * this.row : null,   // first extension row
      };
      for (const n of family) this.#place(n, center - (familyTrack.get(n.id) + 1) * this.row);
      for (const n of main) this.#place(n, center + mainTrack.get(n.id) * this.row);
      for (const n of extensions) this.#place(n, center + (mainRows + extensionTrack.get(n.id)) * this.row);

      this.lanes.push(lane);
      top += lane.height + this.laneGap;
    }
    this.height = top - this.laneGap + 20;
  }

  #place(node, y) { this.positions.set(node.id, { x: this.x(node.date), y }); }

  // How many tracks a packing used.
  static #count(trackOf) { return trackOf.size ? Math.max(...trackOf.values()) + 1 : 0; }

  // Greedy packing: each event goes on the first track that has room for it.
  #packIntoTracks(nodes) {
    const trackEnds = [];
    const trackOf = new Map();
    for (const n of nodes) {
      const bx = this.xBase(n.date);
      let t = trackEnds.findIndex((end) => bx - end >= TimelineLayout.MIN_GAP);
      if (t === -1) { t = trackEnds.length; trackEnds.push(-Infinity); }
      trackEnds[t] = bx;
      trackOf.set(n.id, t);
    }
    return trackOf;
  }

  // Every row in a lane, from the top, with what kind of row it is:
  // "family", "main" (the main line itself), "overflow" (just below it) or "extension".
  rows(lane) {
    const rows = [];
    for (let k = lane.rowsAbove; k >= 1; k--) rows.push({ y: lane.center - k * this.row, kind: "family" });
    rows.push({ y: lane.center, kind: "main" });
    for (let k = 1; k <= lane.rowsBelow; k++) {
      rows.push({ y: lane.center + k * this.row, kind: k < lane.mainRows ? "overflow" : "extension" });
    }
    return rows;
  }

  positionOf(id) { return this.positions.get(id) ?? null; }
  get years() { return this.x.ticks(d3.utcYear.every(1)); }
  xOf(isoDate) { return this.x(new Date(isoDate)); }

  // A right-angle connector, like on the Miro wall: across, turn just after the parent,
  // then across to the child. It stops just before the child so the arrowhead stays visible.
  // An extension hangs straight down from its parent instead (same day, so same x).
  connectorPath(link) {
    const a = this.positionOf(link.source);
    const b = this.positionOf(link.target);
    if (!a || !b) return null;                       // one end has no date
    if (link.isExtension) return `M${a.x},${a.y} V${b.y} H${b.x}`;
    const forward = b.x >= a.x;
    const turn = forward ? a.x + Math.min(14, (b.x - a.x) / 2) : a.x + 14;
    const end = b.x >= turn ? b.x - 7 : b.x + 7;     // stop in front of the diamond
    if (Math.abs(a.y - b.y) < 0.5) return `M${a.x + 5},${a.y} H${end}`;
    return `M${a.x},${a.y} H${turn} V${b.y} H${end}`;
  }
}