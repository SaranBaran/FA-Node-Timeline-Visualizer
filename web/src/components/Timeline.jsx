// Draws a TimelineLayout. All the geometry comes from the layout object;
// this component only turns it into SVG and handles the mouse.
import { useLayoutEffect, useRef, useState } from "react";
import * as d3 from "d3";
import HoverCard from "./HoverCard.jsx";
import { COLORS, MURDER_DATE } from "./theme.js";

const LABEL_W = 190;   // lane-name column
const AXIS_H = 30;     // year labels at the bottom

export default function Timeline({ data, layout, zoomX, zoomY, selectedId, onSelect }) {
  const scroller = useRef(null);
  const last = useRef({ zoomX, zoomY });
  const [hover, setHover] = useState(null);   // { node, mouseX, mouseY } or null

  // Keep the same spot in the middle of the screen when either zoom changes.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const { zoomX: oldX, zoomY: oldY } = last.current;
    if (oldX !== zoomX) el.scrollLeft = ((el.scrollLeft + el.clientWidth / 2) / oldX) * zoomX - el.clientWidth / 2;
    if (oldY !== zoomY) el.scrollTop = ((el.scrollTop + el.clientHeight / 2) / oldY) * zoomY - el.clientHeight / 2;
    last.current = { zoomX, zoomY };
  }, [zoomX, zoomY]);

  const { width, height, row } = layout;
  const murderX = layout.xOf(MURDER_DATE);
  const showTitles = zoomX >= 3;

  return (
    <>
      <div ref={scroller} onScroll={() => setHover(null)}
           style={{ overflow: "auto", maxHeight: "calc(100vh - 170px)", background: COLORS.bg, borderRadius: 8 }}>
        <div style={{ display: "flex", width: LABEL_W + width }}>
          <LaneLabels lanes={layout.lanes} row={row} height={height} />

          <svg width={width} height={height} style={{ display: "block", flex: "none" }}>
            {/* lane bands and their tracks */}
            {layout.lanes.map((lane, i) => (
              <g key={lane.name}>
                <rect x={0} y={lane.top - 8} width={width} height={lane.height + 16}
                      fill={i % 2 ? COLORS.band : COLORS.bg} />
                {Array.from({ length: lane.tracks }, (_, t) => (
                  <line key={t} x1={0} x2={width} y1={layout.trackY(lane.top, t)}
                        y2={layout.trackY(lane.top, t)} stroke={COLORS.grid} strokeWidth="0.5" />
                ))}
              </g>
            ))}

            {/* year lines */}
            {layout.years.map((t) => (
              <line key={t.toISOString()} x1={layout.x(t)} x2={layout.x(t)} y1={0} y2={height}
                    stroke={COLORS.grid} />
            ))}

            {/* the murder */}
            <line x1={murderX} x2={murderX} y1={0} y2={height} stroke={COLORS.murder} strokeDasharray="2 3" />
            <text x={murderX + 4} y={14} fontSize="11" fill={COLORS.murder}>19.01.2007</text>

            {/* links */}
            {data.links.map((link) => {
              const d = layout.connectorPath(link);
              if (!d) return null;
              const s = link.style;
              return <path key={link.key} d={d} fill="none" stroke={s.stroke}
                           strokeWidth={s.width} strokeDasharray={s.dash} />;
            })}

            {/* events */}
            {data.datedNodes.map((node) => (
              <EventMarker key={node.id} node={node} pos={layout.positionOf(node.id)}
                           selected={node.id === selectedId} showTitle={showTitles}
                           onClick={() => onSelect(node.id)}
                           onHover={(e) => setHover({ node, mouseX: e.clientX, mouseY: e.clientY })}
                           onLeave={() => setHover(null)} />
            ))}
          </svg>
        </div>

        <YearAxis layout={layout} />
      </div>

      {hover && <HoverCard node={hover.node} data={data} mouseX={hover.mouseX} mouseY={hover.mouseY} />}
    </>
  );
}

// One event: a diamond, an optional title, and a larger invisible area that catches the mouse.
function EventMarker({ node, pos, selected, showTitle, onClick, onHover, onLeave }) {
  const r = node.special ? 5.5 : 4;
  return (
    <g onClick={onClick} onMouseEnter={onHover} onMouseMove={onHover} onMouseLeave={onLeave}
       style={{ cursor: "pointer" }}>
      <circle cx={pos.x} cy={pos.y} r={10} fill="transparent" />
      <rect x={pos.x - r} y={pos.y - r} width={r * 2} height={r * 2}
            transform={`rotate(45 ${pos.x} ${pos.y})`}
            fill={COLORS.node}
            stroke={selected ? COLORS.selected : node.familyIntervention ? COLORS.family : COLORS.node}
            strokeWidth={selected ? 2.5 : 1.5} />
      {showTitle && (
        <text x={pos.x + 7} y={pos.y - 7} fontSize="10" fill="#d4d4d4">{node.shortTitle(22)}</text>
      )}
    </g>
  );
}

// Lane names: stick to the left edge when scrolling sideways.
function LaneLabels({ lanes, row, height }) {
  return (
    <svg width={LABEL_W} height={height}
         style={{ position: "sticky", left: 0, zIndex: 2, flex: "none",
                  background: COLORS.bg, borderRight: `1px solid ${COLORS.grid}` }}>
      {lanes.map((lane) => {
        const name = lane.name.toLocaleUpperCase("tr");
        return (
          <g key={lane.name}>
            <rect x={8} y={lane.top + row / 2 - 10} width={LABEL_W - 16} height={20} rx={3} fill={lane.color} />
            <text x={14} y={lane.top + row / 2 + 4} fontSize="11" fontWeight="600" fill="#111">
              {name.length > 22 ? name.slice(0, 21) + "…" : name}
            </text>
            <title>{lane.name}</title>
          </g>
        );
      })}
    </svg>
  );
}

// Year labels: stick to the bottom edge when scrolling down.
function YearAxis({ layout }) {
  return (
    <div style={{ display: "flex", width: LABEL_W + layout.width, position: "sticky", bottom: 0, zIndex: 3 }}>
      <div style={{ width: LABEL_W, flex: "none", position: "sticky", left: 0, zIndex: 4,
                    background: COLORS.bg, borderRight: `1px solid ${COLORS.grid}` }} />
      <svg width={layout.width} height={AXIS_H} style={{ display: "block", flex: "none", background: COLORS.bg }}>
        <line x1={0} x2={layout.width} y1={0.5} y2={0.5} stroke={COLORS.grid} />
        {layout.years.map((t) => (
          <text key={t.toISOString()} x={layout.x(t) + 4} y={19} fontSize="12" fill={COLORS.muted}>
            {d3.utcFormat("%Y")(t)}
          </text>
        ))}
      </svg>
    </div>
  );
}