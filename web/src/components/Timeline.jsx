// Draws a TimelineLayout. All the geometry comes from the layout object;
// this component only turns it into SVG and handles the mouse.
import { useLayoutEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Link from "../model/Link.js";
import HoverCard from "./HoverCard.jsx";
import { COLORS, MURDER_DATE, LABEL_W } from "./theme.js";

const AXIS_H = 30;   // year labels at the bottom

// One arrowhead per line colour (an SVG marker can't take its colour from the line).
const LINK_COLORS = [...new Set([...Object.values(Link.STYLES), Link.UNKNOWN_STYLE].map((s) => s.stroke))];
const arrowId = (color) => `arrow-${color.slice(1)}`;

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

  const { width, height } = layout;
  const murderX = layout.xOf(MURDER_DATE);
  const showTitles = zoomX >= 3;

  // The event in focus: the one under the mouse, otherwise the clicked one.
  const focusId = hover?.node.id ?? selectedId ?? null;
  const isFocusLink = (link) => link.source === focusId || link.target === focusId;
  const connected = new Set(focusId ? [focusId] : []);
  if (focusId) for (const l of data.links) if (isFocusLink(l)) { connected.add(l.source); connected.add(l.target); }
  // Draw the focused links last, so they lie on top of the faded ones.
  const links = focusId
    ? [...data.links.filter((l) => !isFocusLink(l)), ...data.links.filter(isFocusLink)]
    : data.links;

  return (
    <>
      <div ref={scroller} onScroll={() => setHover(null)}
           style={{ overflow: "auto", maxHeight: "calc(100vh - 230px)", background: COLORS.bg, borderRadius: 8 }}>
        <div style={{ display: "flex", width: LABEL_W + width }}>
          <LaneLabels lanes={layout.lanes} height={height} />

          <svg width={width} height={height} style={{ display: "block", flex: "none" }}>
            <defs>
              {LINK_COLORS.map((c) => (
                <marker key={c} id={arrowId(c)} viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={c} />
                </marker>
              ))}
            </defs>

            {/* lane bands and their rows; the main line is drawn in the lane's colour */}
            {layout.lanes.map((lane, i) => (
              <g key={lane.name}>
                <rect x={0} y={lane.top - 8} width={width} height={lane.height + 16}
                      fill={i % 2 ? COLORS.band : COLORS.bg} />
                {layout.rowYs(lane).map((y) => (
                  <line key={y} x1={0} x2={width} y1={y} y2={y}
                        stroke={y === lane.center ? lane.color : COLORS.grid}
                        strokeOpacity={y === lane.center ? 0.45 : 1}
                        strokeWidth={y === lane.center ? 1.5 : 0.5} />
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

            {/* links: bright when they touch the focused event, faded otherwise */}
            {links.map((link) => {
              const d = layout.connectorPath(link);
              if (!d) return null;
              const s = link.style;
              const active = focusId !== null && isFocusLink(link);
              const opacity = focusId === null ? 0.8 : active ? 1 : 0.1;
              return <path key={link.key} d={d} fill="none" stroke={s.stroke} opacity={opacity}
                           strokeWidth={active ? s.width + 1.2 : s.width} strokeDasharray={s.dash}
                           markerEnd={`url(#${arrowId(s.stroke)})`} />;
            })}

            {/* events */}
            {data.datedNodes.map((node) => (
              <EventMarker key={node.id} node={node} pos={layout.positionOf(node.id)}
                           selected={node.id === selectedId} showTitle={showTitles || node.id === focusId}
                           faded={focusId !== null && !connected.has(node.id)}
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
function EventMarker({ node, pos, selected, showTitle, faded, onClick, onHover, onLeave }) {
  const r = node.special ? 5.5 : 4;
  return (
    <g onClick={onClick} onMouseEnter={onHover} onMouseMove={onHover} onMouseLeave={onLeave}
       style={{ cursor: "pointer" }} opacity={faded ? 0.25 : 1}>
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

// Lane names: stick to the left edge when scrolling sideways, sit on the lane's main line.
function LaneLabels({ lanes, height }) {
  return (
    <svg width={LABEL_W} height={height}
         style={{ position: "sticky", left: 0, zIndex: 2, flex: "none",
                  background: COLORS.bg, borderRight: `1px solid ${COLORS.grid}` }}>
      {lanes.map((lane) => {
        const name = lane.name.toLocaleUpperCase("tr");
        return (
          <g key={lane.name}>
            <rect x={8} y={lane.center - 10} width={LABEL_W - 16} height={20} rx={3} fill={lane.color} />
            <text x={14} y={lane.center + 4} fontSize="11" fontWeight="600" fill="#111">
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