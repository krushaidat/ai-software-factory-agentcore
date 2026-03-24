import { useRef, useEffect, useState, useCallback } from 'react';
import { C } from '../../config/colors';

export interface GraphNode {
  id: string;
  label: string;
  shortLabel: string;
  type: 'code' | 'pr' | 'defect' | 'requirement' | 'safety' | 'dtc';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

const NODE_COLORS: Record<GraphNode['type'], string> = {
  code: C.accent,
  pr: C.info,
  defect: C.crit,
  requirement: C.purple,
  safety: C.warn,
  dtc: C.orange,
};

const TYPE_LABELS: Record<GraphNode['type'], string> = {
  code: 'Code Entity',
  pr: 'PR / Ticket',
  defect: 'Defect Cluster',
  requirement: 'Requirement',
  safety: 'Safety',
  dtc: 'DTC / Diagnostic',
};

const NODE_RADIUS = 20;

function classifyNode(label: string): GraphNode['type'] {
  if (/^PR\s*#/i.test(label)) return 'pr';
  if (/^DC-/i.test(label)) return 'defect';
  if (/^BR-/i.test(label) || /requirement/i.test(label)) return 'requirement';
  if (/^SG-/i.test(label) || /SafeState/i.test(label) || /SAFE/i.test(label)) return 'safety';
  if (/^TARA/i.test(label) || /^CS-/i.test(label)) return 'safety';
  if (/DTC/i.test(label) || /DIAG/i.test(label) || /DiagCode/i.test(label)) return 'dtc';
  if (/^BRAKE-/i.test(label)) return 'pr';
  return 'code';
}

function shortName(label: string): string {
  // Shorten long names for display
  if (label.includes('::')) return label.split('::')[1];
  if (label.length > 18) return label.slice(0, 16) + '…';
  return label;
}

export function parseGraphData(arrowStrings: string[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const ensureNode = (id: string) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        label: id,
        shortLabel: shortName(id),
        type: classifyNode(id),
        x: 360 + (Math.random() - 0.5) * 300,
        y: 240 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
      });
    }
  };

  for (const s of arrowStrings) {
    const parts = s.split(/\s*→\s*|\s*\u2192\s*/);
    if (parts.length === 2) {
      const [src, tgt] = parts;
      ensureNode(src);
      ensureNode(tgt);
      edges.push({ source: src, target: tgt, label: '' });
    }
  }

  // Extra domain nodes always present
  const extras: Array<{ id: string; type: GraphNode['type'] }> = [
    { id: 'PR #1847', type: 'pr' },
    { id: 'DC-2025-0847', type: 'defect' },
    { id: 'BR-ECU-CAN-007', type: 'requirement' },
    { id: 'SG-BRAKE-01', type: 'safety' },
    { id: 'BRAKE-4521', type: 'pr' },
  ];

  for (const e of extras) {
    if (!nodeMap.has(e.id)) {
      nodeMap.set(e.id, {
        id: e.id,
        label: e.id,
        shortLabel: shortName(e.id),
        type: e.type,
        x: 360 + (Math.random() - 0.5) * 300,
        y: 240 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
      });
    }
  }

  // Extra edges connecting domain entities
  const extraEdges = [
    { source: 'PR #1847', target: 'CAN_TimeoutHandler' },
    { source: 'DC-2025-0847', target: 'CAN_TimeoutHandler' },
    { source: 'BR-ECU-CAN-007', target: 'DiagCode::DIAG_CAN_TIMEOUT' },
    { source: 'SG-BRAKE-01', target: 'SafeState::DEGRADED' },
    { source: 'BRAKE-4521', target: 'DTC_MappingTable' },
    { source: 'PR #1847', target: 'DiagCode::DIAG_CAN_TIMEOUT' },
    { source: 'SG-BRAKE-01', target: 'EVT_BRAKE_DEGRADED' },
  ];

  for (const e of extraEdges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      if (!edges.some((ed) => ed.source === e.source && ed.target === e.target)) {
        edges.push({ source: e.source, target: e.target, label: '' });
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

function simulateTick(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const repulsion = 4000;
  const springLength = 130;
  const springStrength = 0.03;
  const damping = 0.65;
  const centerPull = 0.008;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      a.vx += dx; a.vy += dy;
      b.vx -= dx; b.vy -= dy;
    }
  }

  for (const e of edges) {
    const a = nodes.find((n) => n.id === e.source);
    const b = nodes.find((n) => n.id === e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - springLength;
    const fx = (dx / dist) * displacement * springStrength;
    const fy = (dy / dist) * displacement * springStrength;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  const cx = width / 2, cy = height / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * centerPull;
    n.vy += (cy - n.y) * centerPull;
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(NODE_RADIUS + 40, Math.min(width - NODE_RADIUS - 40, n.x));
    n.y = Math.max(NODE_RADIUS + 20, Math.min(height - NODE_RADIUS - 20, n.y));
  }
}

interface Props {
  arrowStrings: string[];
}

export function KnowledgeGraphViz({ arrowStrings }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const frameRef = useRef(0);
  const [, forceRender] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const dragRef = useRef<{ nodeId: string } | null>(null);

  const WIDTH = 720;
  const HEIGHT = 480;

  useEffect(() => {
    const { nodes, edges } = parseGraphData(arrowStrings);
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [arrowStrings]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      simulateTick(nodesRef.current, edgesRef.current, WIDTH, HEIGHT);
      forceRender((c) => c + 1);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, []);

  const handlePointerDown = useCallback((nodeId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { nodeId };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const node = nodesRef.current.find((n) => n.id === dragRef.current!.nodeId);
    if (!node) return;
    node.x = (e.clientX - rect.left) * scaleX;
    node.y = (e.clientY - rect.top) * scaleY;
    node.vx = 0;
    node.vy = 0;
  }, []);

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (dragRef.current) return;
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const connectedIds = new Set<string>();
  if (selectedNode) {
    connectedIds.add(selectedNode);
    for (const e of edgesRef.current) {
      if (e.source === selectedNode) connectedIds.add(e.target);
      if (e.target === selectedNode) connectedIds.add(e.source);
    }
  }

  const isHighlighted = (id: string) => !selectedNode || connectedIds.has(id);
  const isEdgeHighlighted = (e: GraphEdge) =>
    !selectedNode || e.source === selectedNode || e.target === selectedNode;

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-3 py-2" style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {(['code', 'pr', 'defect', 'requirement', 'safety', 'dtc'] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS[type] }} />
            <span style={{ color: C.muted, fontSize: 10 }}>{TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ display: 'block' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect width={WIDTH} height={HEIGHT} fill={C.bg} />

        {/* Arrow marker definitions */}
        <defs>
          <marker id="kg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.dim} />
          </marker>
          <marker id="kg-arrow-hi" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.accent} />
          </marker>
        </defs>

        {/* Edges as lines between node centers, shortened to not overlap node circles */}
        {edges.map((e, i) => {
          const src = nodes.find((n) => n.id === e.source);
          const tgt = nodes.find((n) => n.id === e.target);
          if (!src || !tgt) return null;
          const active = isEdgeHighlighted(e);

          // Shorten line to stop at node edge
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / dist, uy = dy / dist;
          const x1 = src.x + ux * (NODE_RADIUS + 2);
          const y1 = src.y + uy * (NODE_RADIUS + 2);
          const x2 = tgt.x - ux * (NODE_RADIUS + 8);
          const y2 = tgt.y - uy * (NODE_RADIUS + 8);

          return (
            <line
              key={`e-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={active ? (selectedNode ? C.accent : C.dim) : 'rgba(62,80,106,0.12)'}
              strokeWidth={active ? 1.5 : 0.5}
              markerEnd={active ? 'url(#kg-arrow-hi)' : 'url(#kg-arrow)'}
              style={{ transition: 'stroke 0.3s' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const active = isHighlighted(n.id);
          const color = NODE_COLORS[n.type];
          const isHovered = hoveredNode === n.id;
          const isSelected = selectedNode === n.id;

          return (
            <g
              key={n.id}
              style={{ opacity: active ? 1 : 0.15, cursor: 'grab' }}
              onPointerDown={(ev) => handlePointerDown(n.id, ev)}
              onClick={() => handleNodeClick(n.id)}
              onPointerEnter={() => setHoveredNode(n.id)}
              onPointerLeave={() => setHoveredNode(null)}
            >
              {/* Glow on selection */}
              {isSelected && (
                <circle cx={n.x} cy={n.y} r={NODE_RADIUS + 6} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
              )}

              {/* Node circle */}
              <circle
                cx={n.x} cy={n.y} r={NODE_RADIUS}
                fill={C.surface}
                stroke={color}
                strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
              />
              <circle cx={n.x} cy={n.y} r={5} fill={color} opacity={0.8} />

              {/* Always-visible short label below node */}
              <text
                x={n.x} y={n.y + NODE_RADIUS + 12}
                textAnchor="middle"
                fill={active ? C.muted : 'rgba(122,139,165,0.2)'}
                fontSize={8}
                fontFamily="'DM Sans', sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {n.shortLabel}
              </text>

              {/* Full label tooltip on hover */}
              {(isHovered || isSelected) && (
                <>
                  <rect
                    x={n.x - Math.max(n.label.length * 3.5, 40) - 6}
                    y={n.y - NODE_RADIUS - 28}
                    width={Math.max(n.label.length * 7, 80) + 12}
                    height={20}
                    rx={4}
                    fill={C.raised}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={n.x}
                    y={n.y - NODE_RADIUS - 14}
                    textAnchor="middle"
                    fill={C.text}
                    fontSize={9}
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Instructions + info */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}>
        <span style={{ fontSize: 10, color: C.dim }}>
          Click node to highlight connections · Drag to reposition · {nodes.length} entities, {edges.length} relationships
        </span>
        {selectedNode && (
          <span style={{ fontSize: 10, color: C.accent }}>
            Selected: <strong>{selectedNode}</strong> ({TYPE_LABELS[nodes.find(n => n.id === selectedNode)?.type ?? 'code']})
          </span>
        )}
      </div>
    </div>
  );
}
