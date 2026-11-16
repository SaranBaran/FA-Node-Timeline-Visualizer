// One zoom control: − / slider / + / value.
export default function ZoomControl({ label, value, onChange, max }) {
  const set = (z) => onChange(Math.min(max, Math.max(1, z)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
      <button onClick={() => set(value - 0.5)}>−</button>
      <input type="range" min="1" max={max} step="0.25" value={value}
             onChange={(e) => set(Number(e.target.value))} style={{ width: 160 }} />
      <button onClick={() => set(value + 0.5)}>+</button>
      <span style={{ width: 48 }}>{value}×</span>
    </div>
  );
}