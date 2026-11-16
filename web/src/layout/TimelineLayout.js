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
    this.lanes = [];              // {name, color, top, height, center, rowsAbove, rowsBelow}
    this.#placeLanes(dated);
  }

  // Inside each lane: family interventions above the main line,
  // all other events on the main line (or just below it when they would overlap).
  #placeLanes(dated) {
    const groups = d3.group(dated, (n) => this.grouping.laneOf(n));
    let top = TimelineLayout.TOP;
    for (const name of this.grouping.order(groups.keys(), groups)) {
      const nodes = [...groups.get(name)].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const family = nodes.filter((n) => n.familyIntervention);
      const others = nodes.filter((n) => !n.familyIntervention);

      const familyTrack = this.#packIntoTracks(family);   // 0 = first row above the main line
      const otherTrack = this.#packIntoTracks(others);    // 0 = the main line, 1+ = below it
      const rowsAbove = TimelineLayout.#count(familyTrack);
      const rowsBelow = Math.max(0, TimelineLayout.#count(otherTrack) - 1);

      const center = top + this.row / 2 + rowsAbove * this.row;   // y of the main line
      const lane = {
        name, top, center,
        color: this.grouping.colorOf(name, nodes),
        height: (rowsAbove + 1 + rowsBelow) * this.row,
        rowsAbove, rowsBelow,
      };
      for (const n of family) this.#place(n, center - (familyTrack.get(n.id) + 1) * this.row);
      for (const n of others) this.#place(n, center + otherTrack.get(n.id) * this.row);

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

  // The y of every row in a lane, from the top: family rows, the main line, then the rows below.
  rowYs(lane) {
    const ys = [];
    for (let k = lane.rowsAbove; k >= 1; k--) ys.push(lane.center - k * this.row);
    ys.push(lane.center);
    for (let k = 1; k <= lane.rowsBelow; k++) ys.push(lane.center + k * this.row);
    return ys;
  }

  positionOf(id) { return this.positions.get(id) ?? null; }
  get years() { return this.x.ticks(d3.utcYear.every(1)); }
  xOf(isoDate) { return this.x(new Date(isoDate)); }

  // A right-angle connector: across, turn just after the start, then across (like Miro).
  // A right-angle connector, like on the Miro wall: across, turn just after the parent,
  // then across to the child. It stops just before the child so the arrowhead stays visible.
  connectorPath(link) {
    const a = this.positionOf(link.source);
    const b = this.positionOf(link.target);
    if (!a || !b) return null;                       // one end has no date
    const forward = b.x >= a.x;
    const turn = forward ? a.x + Math.min(14, (b.x - a.x) / 2) : a.x + 14;
    const end = b.x >= turn ? b.x - 7 : b.x + 7;     // stop in front of the diamond
    if (Math.abs(a.y - b.y) < 0.5) return `M${a.x + 5},${a.y} H${end}`;
    return `M${a.x},${a.y} H${turn} V${b.y} H${end}`;
  }
}