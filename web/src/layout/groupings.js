// How events are sorted into lanes. Each grouping is a class with the same methods,
// so the layout can use any of them without knowing which one it has (polymorphism).
import * as d3 from "d3";

const cityColor = d3.scaleOrdinal(d3.schemeTableau10);

export class Grouping {
  constructor(key, label) { this.key = key; this.label = label; }
  laneOf(node) { throw new Error("laneOf() must be written in the subclass"); }
  colorOf(laneName, nodes) { return cityColor(nodes[0]?.city ?? "Unknown"); }
  // Default order: the lane whose story starts first comes first.
  order(laneNames, groups) {
    const first = (name) => d3.min(groups.get(name), (n) => n.startDate);
    return [...laneNames].sort((a, b) => first(a).localeCompare(first(b)));
  }
}

export class KindGrouping extends Grouping {
  static KINDS = [
    { name: "JANDARMA & EMNİYET", color: "#4ade80", match: /jandarma|emniyet/i },
    { name: "BAKANLIK & VALİLİK", color: "#f472b6", match: /bakanlığı|valiliği/i },
    { name: "SAVCILIK",           color: "#facc15", match: /başsavcılığı|savcı/i },
    { name: "MAHKEMELER",         color: "#7dd3fc", match: /mahkeme|yargıtay|ceza dairesi/i },
    { name: "DİĞER / OLAY YERİ",  color: "#f87171", match: /.*/ },   // catches the rest
  ];
  constructor() { super("kind", "type of institution (5 lanes)"); }
  laneOf(node) {
    return KindGrouping.KINDS.find((k) => k.match.test(node.institution ?? "")).name;
  }
  colorOf(laneName) { return KindGrouping.KINDS.find((k) => k.name === laneName).color; }
  order(laneNames) {
    const rank = (name) => KindGrouping.KINDS.findIndex((k) => k.name === name);
    return [...laneNames].sort((a, b) => rank(a) - rank(b));
  }
}

export class CityGrouping extends Grouping {
  constructor() { super("city", "city"); }
  laneOf(node) { return node.city ?? "Unknown"; }
}

export class InstitutionGrouping extends Grouping {
  constructor() { super("institution", "institution (every office)"); }
  laneOf(node) { return node.institution ?? "Unknown"; }
}

export class CaseGrouping extends Grouping {
  constructor() { super("case", "case"); }
  laneOf(node) { return node.cases[0] ?? "No case"; }
}

export class SingleLaneGrouping extends Grouping {
  constructor() { super("none", "nothing (one lane)"); }
  laneOf() { return "All events"; }
  colorOf() { return "#a1a1aa"; }
}

// The list the dropdown shows. Add a new grouping class here to add an option.
export const GROUPINGS = [
  new KindGrouping(), new CityGrouping(), new InstitutionGrouping(),
  new CaseGrouping(), new SingleLaneGrouping(),
];
export const groupingByKey = (key) => GROUPINGS.find((g) => g.key === key);