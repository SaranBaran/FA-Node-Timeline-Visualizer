import { useEffect, useMemo, useState } from "react";
import TimelineData from "./model/TimelineData.js";
import TimelineLayout from "./layout/TimelineLayout.js";
import { GROUPINGS, groupingByKey } from "./layout/groupings.js";
import Timeline from "./components/Timeline.jsx";
import ZoomControl from "./components/ZoomControl.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import { COLORS } from "./components/theme.js";

export default function App() {
  const [data, setData] = useState(null);          // a TimelineData object
  const [error, setError] = useState(null);
  const [groupKey, setGroupKey] = useState("kind");
  const [zoomX, setZoomX] = useState(1);
  const [zoomY, setZoomY] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // Load the data once, when the page opens.
  useEffect(() => {
    TimelineData.load("/data.json").then(setData).catch((err) => setError(err.message));
  }, []);

  // Recompute the layout only when the data, the grouping or a zoom changes.
  const layout = useMemo(
    () => (data ? new TimelineLayout(data, groupingByKey(groupKey), zoomX, zoomY) : null),
    [data, groupKey, zoomX, zoomY]
  );

  if (error) return <p>Could not load data.json: {error}</p>;
  if (!data) return <p>Loading…</p>;

  const selected = data.get(selectedId);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: COLORS.page,
                   color: COLORS.text, minHeight: "100vh" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>
        Hrant Dink Timeline{" "}
        <span style={{ fontSize: 14, fontWeight: 400, color: COLORS.muted }}>
          {data.nodes.length} events, {data.links.length} links
        </span>
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
        <label>
          Lanes by:{" "}
          <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
            {GROUPINGS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
        <ZoomControl label="Time ↔" value={zoomX} onChange={setZoomX} max={12} />
        <ZoomControl label="Rows ↕" value={zoomY} onChange={setZoomY} max={4} />
        <button onClick={() => { setZoomX(1); setZoomY(1); }}>Fit</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <Timeline data={data} layout={layout} zoomX={zoomX} zoomY={zoomY}
                  selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {selected && (
        <DetailPanel node={selected} data={data} onSelect={setSelectedId}
                     onClose={() => setSelectedId(null)} />
      )}
    </main>
  );
}
