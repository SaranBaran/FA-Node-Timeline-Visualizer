// All events and links, with lookups. The only class that knows the JSON format.
import EventNode from "./EventNode.js";
import Link from "./Link.js";

export default class TimelineData {
  constructor(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.byId = new Map(nodes.map((n) => [n.id, n]));
    // Events that hang off another event ("extension of the same event"), and their parent.
    this.parentOf = new Map(links.filter((l) => l.isExtension).map((l) => [l.target, l.source]));
  }

  static fromJSON(json) {
    return new TimelineData(
      (json.nodes ?? []).map((raw) => new EventNode(raw)),
      (json.edges ?? []).map((raw) => new Link(raw)),
    );
  }

  static async load(url = "/data.json") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return TimelineData.fromJSON(await res.json());
  }

  get datedNodes() { return this.nodes.filter((n) => n.hasDate); }
  get(id) { return this.byId.get(id) ?? null; }
  linksFrom(id) { return this.links.filter((l) => l.source === id); }
  linksTo(id) { return this.links.filter((l) => l.target === id); }
  isExtension(id) { return this.parentOf.has(id); }

  // Everything an event leads to, step after step (breadth-first).
  // order: the reached events in the order they light up — by step, then by date (the event itself first)
  // rank:  event id -> its position in `order`
  // links: link key -> position in `order` at which the link lights up (when both its ends are lit)
  // ends:  reached events that lead nowhere further
  reachableFrom(id) {
    const stepOf = new Map([[id, 0]]);
    const queue = [id];
    const reached = [];
    while (queue.length) {
      const current = queue.shift();
      for (const link of this.linksFrom(current)) {
        reached.push(link);
        if (!stepOf.has(link.target)) { stepOf.set(link.target, stepOf.get(current) + 1); queue.push(link.target); }
      }
    }
    const dateOf = (n) => this.get(n)?.startDate ?? "9999";
    const order = [...stepOf.keys()].sort((a, b) =>
      stepOf.get(a) - stepOf.get(b) || dateOf(a).localeCompare(dateOf(b)));
    const rank = new Map(order.map((n, i) => [n, i]));
    const links = new Map(reached.map((l) => [l.key, Math.max(rank.get(l.source), rank.get(l.target))]));
    const ends = new Set(order.filter((n) => n !== id && this.linksFrom(n).length === 0));
    return { order, rank, links, ends };
  }

  // The main event an extension belongs to (an event that is not an extension is its own main event).
  mainEventOf(node) {
    const seen = new Set();
    while (this.isExtension(node.id) && !seen.has(node.id)) {
      seen.add(node.id);
      node = this.get(this.parentOf.get(node.id)) ?? node;
    }
    return node;
  }
}