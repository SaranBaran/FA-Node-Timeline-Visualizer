// Draws a TimelineLayout. All the geometry comes from the layout object;
// this component only turns it into SVG and handles the mouse.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Link from "../model/Link.js";
import HoverCard from "./HoverCard.jsx";
import EventMark, { markKindOf } from "./EventMark.jsx";
import { COLORS, MURDER_DATE, LABEL_W } from "./theme.js";

const AXIS_H = 30;   // year labels at the bottom
const STEP_MS = 1200; // full chain: time between two events lighting up
const DRAW_MS = 900;  // full chain: how long one line takes to draw (a bit shorter than a step)
// Grows a line from its start to its end: the dash covers nothing at offset 1 and everything at 0.
const DRAW_CSS = "@keyframes drawLine { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }";
const maskId = (link) => `${link.source}-${link.target}`;

// One arrowhead per line colour (an SVG marker can't take its colour from the line).
const LINK_COLORS = [...new Set([...Object.values(Link.STYLES), Link.UNKNOWN_STYLE].map((s) => s.stroke))];
const arrowId = (color) => `arrow-${color.slice(1)}`;

export default function Timeline({ data, layout, zoomX, zoomY, selectedId, onSelect, fullChain,
                                   centerOn, onChainStep }) {
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

  // "Zoom to this event": when App asks (centerOn = {id, n}), scroll so that event is in the middle.
  // It runs after the zoom effect above, so it wins. `n` makes each click a new request.
  const centered = useRef(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    const pos = centerOn && layout.positionOf(centerOn.id);
    if (!el || !pos || centered.current === centerOn.n) return;
    centered.current = centerOn.n;
    el.scrollLeft = LABEL_W + pos.x - el.clientWidth / 2;
    el.scrollTop = pos.y - el.clientHeight / 2;
  }, [centerOn, layout]);

  const { width, height } = layout;
  const murderX = layout.xOf(MURDER_DATE);
  const showTitles = zoomX >= 3;

  // The event in focus: the one under the mouse, otherwise the clicked one.
  // With the full chain on, only a click starts a chain (hovering just shows the card).
  const focusId = fullChain ? selectedId ?? null : hover?.node.id ?? selectedId ?? null;
  // Normal: only the links touching the focused event.
  // Full chain: everything the focused event leads to, step after step, with the end points named.
  const reach = useMemo(
    () => (focusId && fullChain ? data.reachableFrom(focusId) : null),
    [data, focusId, fullChain]
  );

  // Full chain lights up one event at a time, in `reach.order`: first the event itself,
  // then what it leads to, and so on. `anim` remembers which event the count belongs to,
  // so a new event always starts again from the beginning.
  const [anim, setAnim] = useState({ id: null, step: 0 });
  useEffect(() => {
    if (!reach) return;
    setAnim({ id: focusId, step: 0 });
    const lastIndex = reach.order.length - 1;
    const timer = setInterval(() => {
      setAnim((a) => (a.step >= lastIndex ? a : { ...a, step: a.step + 1 }));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [reach, focusId]);
  const step = anim.id === focusId ? anim.step : 0;
  const lit = (positions, key) => positions.has(key) && positions.get(key) <= step;

  // The event that lit up last: the side panel shows it.
  const current = reach ? data.get(reach.order[Math.min(step, reach.order.length - 1)]) : null;
  const currentPos = current ? layout.positionOf(current.id) : null;

  // Scroll so the event that just lit up is on screen.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !currentPos) return;
    const x = LABEL_W + currentPos.x, y = currentPos.y;
    const visibleX = x > el.scrollLeft + LABEL_W + 40 && x < el.scrollLeft + el.clientWidth - 40;
    const visibleY = y > el.scrollTop + 30 && y < el.scrollTop + el.clientHeight - 30;
    if (!visibleX || !visibleY) {
      el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: "smooth" });
    }
  }, [current?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const isFocusLink = (link) => reach
    ? lit(reach.links, link.key)
    : link.source === focusId || link.target === focusId;
  const connected = new Set(focusId ? [focusId] : []);
  if (reach) { for (const id of reach.order) if (lit(reach.rank, id)) connected.add(id); }
  else if (focusId) for (const l of data.links) if (isFocusLink(l)) { connected.add(l.source); connected.add(l.target); }
  const isEnd = (id) => (reach ? reach.ends.has(id) && lit(reach.rank, id) : false);

  // Tell App which event the chain has reached, so the side panel can show it.
  useEffect(() => {
    onChainStep?.(reach && current ? { id: current.id, number: step + 1, total: reach.order.length } : null);
  }, [reach, current?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // The small card follows the mouse (the side panel shows the chain's current event).
  const card = hover ? { node: hover.node, x: hover.mouseX, y: hover.mouseY } : null;

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
            <style>{DRAW_CSS}</style>
            <defs>
              {LINK_COLORS.map((c) => (
                <marker key={c} id={arrowId(c)} viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={c} />
                </marker>
              ))}
            </defs>

            {/* lane bands and their rows: the main line in the lane's colour,
                the same-day-parts rows on a light strip in the lane's colour */}
            {layout.lanes.map((lane, i) => {
              const stripTop = lane.extensionY - layout.row / 2;
              return (
                <g key={lane.name}>
                  <rect x={0} y={lane.top - 8} width={width} height={lane.height + 16}
                        fill={i % 2 ? COLORS.band : COLORS.bg} />
                  {lane.extensionY !== null && (
                    <rect x={0} y={stripTop} width={width} height={lane.top + lane.height - stripTop}
                          fill={lane.color} fillOpacity={0.07} />
                  )}
                  {layout.rows(lane).map(({ y, kind }) => (
                    <line key={y} x1={0} x2={width} y1={y} y2={y}
                          stroke={kind === "main" || kind === "extension" ? lane.color : COLORS.grid}
                          strokeOpacity={kind === "main" ? 0.6 : kind === "extension" ? 0.25 : 1}
                          strokeWidth={kind === "main" ? 2 : 0.5}
                          strokeDasharray={kind === "extension" ? "1 4" : null} />
                  ))}
                </g>
              );
            })}

            {/* year lines */}
            {layout.years.map((t) => (
              <line key={t.toISOString()} x1={layout.x(t)} x2={layout.x(t)} y1={0} y2={height}
                    stroke={COLORS.grid} />
            ))}

            {/* the murder */}
            <line x1={murderX} x2={murderX} y1={0} y2={height} stroke={COLORS.murder} strokeDasharray="2 3" />
            <text x={murderX + 4} y={14} fontSize="11" fill={COLORS.murder}>19.01.2007</text>

            {/* links: bright when they touch the focused event (or its chain so far), faded otherwise.
                In a full chain, the link that lights up at this step is drawn slowly from start to end. */}
            {links.map((link) => {
              const d = layout.connectorPath(link);
              if (!d) return null;
              const s = link.style;
              const active = focusId !== null && isFocusLink(link);
              const opacity = focusId === null ? 0.8 : active ? 1 : 0.1;
              const drawing = reach !== null && reach.links.get(link.key) === step;
              // An extension is not a new step, so it gets no arrowhead.
              const path = (
                <path d={d} fill="none" stroke={s.stroke} opacity={opacity}
                      strokeWidth={active ? s.width + 1.2 : s.width} strokeDasharray={s.dash}
                      markerEnd={link.isExtension ? null : `url(#${arrowId(s.stroke)})`}
                      mask={drawing ? `url(#draw-${maskId(link)})` : null} />
              );
              if (!drawing) return <g key={link.key}>{path}</g>;
              // The mask is a copy of the line that grows from 0 to full length (see DRAW_CSS),
              // so only the part it already covers is visible. Its key includes the step,
              // so React makes a new one and the animation starts again each time.
              return (
                <g key={`${link.key}@${step}`}>
                  <mask id={`draw-${maskId(link)}`} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                    <path d={d} fill="none" stroke="white" strokeWidth={14} strokeLinecap="square"
                          pathLength={1} strokeDasharray="1 1"
                          style={{ animation: `drawLine ${DRAW_MS}ms linear forwards` }} />
                  </mask>
                  {path}
                </g>
              );
            })}

            {/* events */}
            {data.datedNodes.map((node) => (
              <EventMarker key={node.id} node={node} pos={layout.positionOf(node.id)}
                           kind={markKindOf(node, data)}
                           selected={node.id === selectedId}
                           showTitle={showTitles || node.id === focusId || isEnd(node.id)}
                           faded={focusId !== null && !connected.has(node.id)}
                           onClick={() => onSelect(node.id)}
                           onHover={(e) => setHover({ node, mouseX: e.clientX, mouseY: e.clientY })}
                           onLeave={() => setHover(null)} />
            ))}
          </svg>
        </div>

        <YearAxis layout={layout} />
      </div>

      {card && <HoverCard node={card.node} data={data} mouseX={card.x} mouseY={card.y} />}
    </>
  );
}

// One event: its mark, an optional title, and a larger invisible area that catches the mouse.
function EventMarker({ node, pos, kind, selected, showTitle, faded, onClick, onHover, onLeave }) {
  return (
    <g onClick={onClick} onMouseEnter={onHover} onMouseMove={onHover} onMouseLeave={onLeave}
       style={{ cursor: "pointer" }} opacity={faded ? 0.25 : 1}>
      <circle cx={pos.x} cy={pos.y} r={10} fill="transparent" />
      <EventMark kind={kind} x={pos.x} y={pos.y} selected={selected} />
      {showTitle && (
        <text x={pos.x + 8} y={pos.y - 8} fontSize="10" fill="#d4d4d4">{node.shortTitle(22)}</text>
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
            {lane.extensionY !== null && (
              <text x={LABEL_W - 10} y={lane.extensionY + 4} fontSize="10" textAnchor="end"
                    fill={COLORS.muted}>↳ same-day parts</text>
            )}
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