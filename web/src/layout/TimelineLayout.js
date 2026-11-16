// Works out where everything goes: x from the date, y from the lane and sub-track.
// Knows nothing about React; it only does the geometry.
import * as d3 from "d3";

export default class TimelineLayout {
  static BASE_WIDTH = 1400;  // width of the time axis at zoom 1
  static PAD_X = 30;         // space before the first and after the last event
  static TOP = 30;           // space above the first lane
  static ROW = 26;           // between sub-tracks, at row-zoom 1
  static LANE_GAP = 34;      // between lanes, at row-zoom 1
  static MIN_GAP = 9;        // at zoom 1, closer events go on a new sub-track

  constructor(data, grouping, zoomX = 1, zoomY = 1) {
    this.data = data;
    this.grouping = grouping;
    this.width = TimelineLayout.BASE_WIDTH * zoomX;
    this.row = TimelineLayout.ROW * zoomY;
    this.laneGap = TimelineLayout.LANE_GAP * zoomY;

    const dated = data.datedNodes;
    const { PAD_X, BASE_WIDTH } = TimelineLayout;
    // The base scale (zoom 1) decides the sub-tracks, so lanes don't jump when zooming.
    this.xBase = d3.scaleUtc().domain(d3.extent(dated, (n) => n.date))
      .range([PAD_X, BASE_WIDTH - PAD_X]).nice();
    this.x = this.xBase.copy().range([PAD_X, this.width - PAD_X]);

    this.positions = new Map();   // node id -> {x, y}
    this.lanes = [];              // {name, color, top, height, tracks}
    this.#placeLanes(dated);
  }

  #placeLanes(dated) {
    const groups = d3.group(dated, (n) => this.grouping.laneOf(n));
    let top = TimelineLayout.TOP;
    for (const name of this.grouping.order(groups.keys(), groups)) {
      const nodes = [...groups.get(name)].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const tracks = this.#packIntoTracks(nodes, top);
      const height = Math.max(1, tracks) * this.row;
      this.lanes.push({ name, color: this.grouping.colorOf(name, nodes), top, height, tracks });
      top += height + this.laneGap;
    }
    this.height = top - this.laneGap + 20;
  }

  // Greedy packing: each event goes on the first sub-track that has room for it.
  #packIntoTracks(nodes, top) {
    const trackEnds = [];
    for (const n of nodes) {
      const bx = this.xBase(n.date);
      let t = trackEnds.findIndex((end) => bx - end >= TimelineLayout.MIN_GAP);
      if (t === -1) { t = trackEnds.length; trackEnds.push(-Infinity); }
      trackEnds[t] = bx;
      this.positions.set(n.id, { x: this.x(n.date), y: this.trackY(top, t) });
    }
    return trackEnds.length;
  }

  trackY(laneTop, track) { return laneTop + this.row / 2 + track * this.row; }
  positionOf(id) { return this.positions.get(id) ?? null; }
  get years() { return this.x.ticks(d3.utcYear.every(1)); }
  xOf(isoDate) { return this.x(new Date(isoDate)); }

  // A right-angle connector: across, turn just after the start, then across (like Miro).
  connectorPath(link) {
    const a = this.positionOf(link.source);
    const b = this.positionOf(link.target);
    if (!a || !b) return null;                 // one end has no date
    if (Math.abs(a.y - b.y) < 0.5) return `M${a.x},${a.y} H${b.x}`;
    const turn = b.x >= a.x ? a.x + Math.min(14, (b.x - a.x) / 2) : a.x + 14;
    return `M${a.x},${a.y} H${turn} V${b.y} H${b.x}`;
  }
}