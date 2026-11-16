// One event on the timeline. Mirrors the EventNode dataclass in scripts/model.py.
export default class EventNode {
  constructor(raw) {
    this.id = String(raw.id ?? "").trim().toUpperCase();
    this.title = raw.title ?? "";
    this.description = raw.description ?? "";
    this.startDate = raw.start_date ?? null;      // "2007-01-19" or null
    this.familyIntervention = Boolean(raw.family_intervention);
    this.special = Boolean(raw.special);
    this.suspects = EventNode.toList(raw.suspects, /,|;| ve /);
    this.cases = EventNode.toList(raw.cases, /;/);
    this.city = raw.location ?? null;
    this.institutions = EventNode.toList(raw.sub_location, /;/);
  }

  // A cell can arrive as a list, a string or null. This always gives a clean list.
  static toList(value, separator) {
    if (Array.isArray(value)) return value.map((s) => String(s).replace(/[’']+$/, "").trim());
    if (!value) return [];
    return String(value).split(separator).map((s) => s.replace(/[’']+$/, "").trim()).filter(Boolean);
  }

  get hasDate() { return this.startDate !== null; }
  get date() { return this.hasDate ? new Date(this.startDate) : null; }
  get institution() { return this.institutions[0] ?? null; }

  // "2007-01-19" -> "19.01.2007"
  get dateLabel() {
    if (!this.hasDate) return "no date";
    const [y, m, d] = this.startDate.split("-");
    return `${d}.${m}.${y}`;
  }

  shortTitle(max) {
    return this.title.length > max ? this.title.slice(0, max - 1) + "…" : this.title;
  }
}