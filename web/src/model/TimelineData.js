// All events and links, with lookups. The only class that knows the JSON format.
import EventNode from "./EventNode.js";
import Link from "./Link.js";

export default class TimelineData {
  constructor(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.byId = new Map(nodes.map((n) => [n.id, n]));
  }

  // Build from the parsed JSON: { nodes: [...], edges: [...] }
  static fromJSON(json) {
    return new TimelineData(
      (json.nodes ?? []).map((raw) => new EventNode(raw)),
      (json.edges ?? []).map((raw) => new Link(raw)),
    );
  }

  // Fetch data.json from the website and build the object.
  static async load(url = "/data.json") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return TimelineData.fromJSON(await res.json());
  }

  get datedNodes() { return this.nodes.filter((n) => n.hasDate); }
  get(id) { return this.byId.get(id) ?? null; }
  linksFrom(id) { return this.links.filter((l) => l.source === id); }
  linksTo(id) { return this.links.filter((l) => l.target === id); }
}