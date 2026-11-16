import { useEffect, useMemo, useRef, useState } from "react";
import TimelineData from "./model/TimelineData.js";
import TimelineLayout from "./layout/TimelineLayout.js";
import { GROUPINGS, groupingByKey } from "./layout/groupings.js";
import Timeline from "./components/Timeline.jsx";
import ZoomControl from "./components/ZoomControl.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import Legend from "./components/Legend.jsx";
import { COLORS, LABEL_W } from "./components/theme.js";

export default function App() {
  const [data, setData] = useState(null);          // a TimelineData object
  const [error, setError] = useState(null);
  const [groupKey, setGroupKey] = useState("kind");
  const [zoomX, setZoomX] = useState(1);
  const [zoomY, setZoomY] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [areaWidth, setAreaWidth] = useState(1400 + LABEL_W);   // width of the timeline box on screen
  const area = useRef(null);

  // Load the data once, when the page opens.
  useEffect(() => {
    TimelineData.load("/data.json").then(setData).catch((err) => setError(err.message));
  }, []);

  // Measure the timeline box, and measure again whenever the window is resized,
  // so that at zoom 1 the timeline fills the whole width.
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver(([entry]) => setAreaWidth(entry.contentRect.width));
    observer.observe(area.current);
    return () => observer.disconnect();
  }, [data]);

  // Recompute the layout only when the data, the grouping, a zoom or the width changes.
  const baseWidth = Math.max(600, areaWidth - LABEL_W - 2);
  const layout = useMemo(
    () => (data ? new TimelineLayout(data, groupingByKey(groupKey), zoomX, zoomY, baseWidth) : null),
    [data, groupKey, zoomX, zoomY, baseWidth]
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

      {/* toolbar: always above the timeline, so it stays on screen */}
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

      <div ref={area} style={{ marginTop: 12 }}>
        <Timeline data={data} layout={layout} zoomX={zoomX} zoomY={zoomY}
                  selectedId={selectedId} onSelect={setSelectedId} />
        <Legend />
      </div>

      {selected && (
        <DetailPanel node={selected} data={data} onSelect={setSelectedId}
                     onClose={() => setSelectedId(null)} />
      )}
    </main>
  );
}