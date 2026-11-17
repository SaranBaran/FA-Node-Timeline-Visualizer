import { useEffect, useMemo, useRef, useState } from "react";
import TimelineData from "./model/TimelineData.js";
import TimelineLayout from "./layout/TimelineLayout.js";
import { GROUPINGS, groupingByKey } from "./layout/groupings.js";
import Timeline from "./components/Timeline.jsx";
import ZoomControl from "./components/ZoomControl.jsx";
import DetailPanel, { PANEL_W } from "./components/DetailPanel.jsx";
import Legend from "./components/Legend.jsx";
import { COLORS, LABEL_W } from "./components/theme.js";

export default function App() {
  const [data, setData] = useState(null);          // a TimelineData object
  const [error, setError] = useState(null);
  const [groupKey, setGroupKey] = useState("kind");
  const [zoomX, setZoomX] = useState(1);
  const [zoomY, setZoomY] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [fullChain, setFullChain] = useState(false);   // highlight everything an event leads to
  const [chain, setChain] = useState(null);            // {id, number, total}: where a running chain is
  const [centerOn, setCenterOn] = useState(null);      // {id, n}: "zoom to this event" request
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

  // The side panel shows the chain's current event while a chain runs, otherwise the clicked event.
  const shown = data.get(chain?.id ?? selectedId);

  // Zoom in around one event and put it in the middle of the screen.
  const zoomTo = (id) => {
    setZoomX((z) => Math.max(z, 6));
    setZoomY((z) => Math.max(z, 1.5));
    setCenterOn((c) => ({ id, n: (c?.n ?? 0) + 1 }));
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: COLORS.page,
                   color: COLORS.text, minHeight: "100vh",
                   paddingRight: shown ? PANEL_W + 16 : 16 }}>   {/* room for the side panel */}
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
        <label title="When on, clicking an event lights up every event it leads to, one after another, and the side panel follows along">
          <input type="checkbox" checked={fullChain} onChange={(e) => setFullChain(e.target.checked)} />{" "}
          Show where it leads (full chain)
        </label>
      </div>

      <div ref={area} style={{ marginTop: 12 }}>
        <Timeline data={data} layout={layout} zoomX={zoomX} zoomY={zoomY}
                  selectedId={selectedId} onSelect={setSelectedId} fullChain={fullChain}
                  centerOn={centerOn} onChainStep={setChain} />
        <Legend />
      </div>

      {shown && (
        <DetailPanel node={shown} data={data} onSelect={setSelectedId} onZoom={zoomTo}
                     chain={chain} onClose={() => setSelectedId(null)} />
      )}
    </main>
  );
}