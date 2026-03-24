import { useRef, useEffect, useState, useCallback } from 'react';
import { C } from '../../config/colors';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface GraphNode {
  id: string;
  label: string;
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

/* ------------------------------------------------------------------ */
/*  Color map by node type                                             */
/* ------------------------------------------------------------------ */
const NODE_COLORS: Record<GraphNode['type'], string> = {
  code: C.accent,
  pr: C.info,
  defect: C.crit,
  requirement: C.purple,
  safety: C.warn,
  dtc: C.orange,
};

const NODE_RADIUS = 22;

/* ------------------------------------------------------------------ */
/*  Helpers to classify a label into a node type                       */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Parse arrow strings into nodes + edges                             */
/* ------------------------------------------------------------------ */
export function parseGraphData(arrowStrings: string[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const ensureNode = (id: string) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        label: id,
        type: classifyNode(id),
        x: 300 + (Math.random() - 0.5) * 400,
        y: 250 + (Math.random() - 0.5) * 300,
        vx: 0,
        vy: 0,
      });
    }
  };

  for (const s of arrowStrings) {
    const parts = s.split(/\s*\u2192\s*/);
    if (parts.length === 2) {
      const [src, tgt] = parts;
      ensureNode(src);
      ensureNode(tgt);
      edges.push({ source: src, target: tgt, label: '' });
    }
  }

  /* Extra nodes that always exist in the domain but aren't in arrow strings */
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
        type: e.type,
        x: 300 + (Math.random() - 0.5) * 400,
        y: 250 + (Math.random() - 0.5) * 300,
        vx: 0,
        vy: 0,
      });
    }
  }

  /* Extra edges connecting extras to the main graph */
  const extraEdges: Array<{ source: string; target: string }> = [
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
      const exists = edges.some(
        (ed) => ed.source === e.source && ed.target === e.target,
      );
      if (!exists) edges.push({ source: e.source, target: e.target, label: '' });
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

/* ------------------------------------------------------------------ */
/*  Force simulation tick                                              */
/* ------------------------------------------------------------------ */
function simulateTick(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const alpha = 0.3;
  const repulsion = 3000;
  const springLength = 140;
  const springStrength = 0.04;
  const damping = 0.7;
  const centerPull = 0.01;

  /* Repulsion between all node pairs */
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      dx = (dx / dist) * force * alpha;
      dy = (dy / dist) * force * alpha;
      a.vx += dx;
      a.vy += dy;
      b.vx -= dx;
      b.vy -= dy;
    }
  }

  /* Spring attraction along edges */
  for (const e of edges) {
    const a = nodes.find((n) => n.id === e.source);
    const b = nodes.find((n) => n.id === e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - springLength;
    const fx = (dx / dist) * displacement * springStrength * alpha;
    const fy = (dy / dist) * displacement * springStrength * alpha;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  /* Center gravity */
  const cx = width / 2;
  const cy = height / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * centerPull * alpha;
    n.vy += (cy - n.y) * centerPull * alpha;
  }

  /* Apply velocity with damping and boundary clamping */
  for (const n of nodes) {
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(NODE_RADIUS + 4, Math.min(width - NODE_RADIUS - 4, n.x));
    n.y = Math.max(NODE_RADIUS + 4, Math.min(height - NODE_RADIUS - 4, n.y));
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
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
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [appeared, setAppeared] = useState<Set<string>>(new Set());

  const WIDTH = 720;
  const HEIGHT = 480;

  /* Parse data on arrow changes */
  useEffect(() => {
    const { nodes, edges } = parseGraphData(arrowStrings);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    /* Stagger appearance */
    const timers: ReturnType<typeof setTimeout>[] = [];
    nodes.forEach((n, i) => {
      timers.push(
        setTimeout(() => {
          setAppeared((prev) => new Set(prev).add(n.id));
        }, i * 60),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [arrowStrings]);

  /* Animation loop */
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      simulateTick(nodesRef.current, edgesRef.current, WIDTH, HEIGHT);
      forceRender((c) => c + 1);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* Drag handlers */
  const handlePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      dragRef.current = {
        nodeId,
        offsetX: e.clientX - node.x,
        offsetY: e.clientY - node.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const node = nodesRef.current.find((n) => n.id === dragRef.current!.nodeId);
    if (!node) return;
    node.x = e.clientX - rect.left;
    node.y = e.clientY - rect.top;
    node.vx = 0;
    node.vy = 0;
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (dragRef.current) return;
      setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    },
    [],
  );

  /* Determine which nodes/edges are "active" when a node is selected */
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
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Legend */}
      <div
        className="flex flex-wrap gap-3"
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        {(
          [
            ['code', 'Code'],
            ['pr', 'PR / Ticket'],
            ['defect', 'Defect'],
            ['requirement', 'Requirement'],
            ['safety', 'Safety'],
            ['dtc', 'DTC / Diag'],
          ] as const
        ).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: NODE_COLORS[type],
              }}
            />
            <span style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ display: 'block', cursor: dragRef.current ? 'grabbing' : 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background */}
        <rect width={WIDTH} height={HEIGHT} fill={C.bg} />

        {/* Edges */}
        {edges.map((e, i) => {
          const src = nodes.find((n) => n.id === e.source);
          const tgt = nodes.find((n) => n.id === e.target);
          if (!src || !tgt) return null;
          if (!appeared.has(src.id) || !appeared.has(tgt.id)) return null;
          const active = isEdgeHighlighted(e);
          return (
            <line
              key={`e-${i}`}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={active ? C.dim : 'rgba(62,80,106,0.15)'}
              strokeWidth={active ? 1.5 : 0.7}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
          );
        })}

        {/* Arrow heads */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.dim} />
          </marker>
          <marker
            id="arrow-dim"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(62,80,106,0.15)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const src = nodes.find((n) => n.id === e.source);
          const tgt = nodes.find((n) => n.id === e.target);
          if (!src || !tgt) return null;
          if (!appeared.has(src.id) || !appeared.has(tgt.id)) return null;
          const active = isEdgeHighlighted(e);
          return (
            <line
              key={`ea-${i}`}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke="transparent"
              strokeWidth={0}
              markerEnd={active ? 'url(#arrow)' : 'url(#arrow-dim)'}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          if (!appeared.has(n.id)) return null;
          const active = isHighlighted(n.id);
          const color = NODE_COLORS[n.type];
          const isHovered = hoveredNode === n.id;
          const isSelected = selectedNode === n.id;
          const scale = appeared.has(n.id) ? 1 : 0;

          return (
            <g
              key={n.id}
              style={{
                transform: `translate(${n.x}px, ${n.y}px) scale(${scale})`,
                transformOrigin: `${n.x}px ${n.y}px`,
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: active ? 1 : 0.18,
                cursor: 'pointer',
              }}
              onPointerDown={(e) => handlePointerDown(n.id, e)}
              onClick={() => handleNodeClick(n.id)}
              onPointerEnter={() => setHoveredNode(n.id)}
              onPointerLeave={() => setHoveredNode(null)}
            >
              {/* Glow ring on selection */}
              {isSelected && (
                <circle
                  cx={0}
                  cy={0}
                  r={NODE_RADIUS + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.4}
                />
              )}

              {/* Outer ring */}
              <circle
                cx={0}
                cy={0}
                r={NODE_RADIUS}
                fill={C.surface}
                stroke={color}
                strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
              />

              {/* Inner dot */}
              <circle cx={0} cy={0} r={6} fill={color} opacity={0.8} />

              {/* Label on hover */}
              {(isHovered || isSelected) && (
                <>
                  <rect
                    x={-n.label.length * 3.4 - 6}
                    y={-NODE_RADIUS - 24}
                    width={n.label.length * 6.8 + 12}
                    height={18}
                    rx={4}
                    fill={C.raised}
                    stroke={C.border}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={-NODE_RADIUS - 12}
                    textAnchor="middle"
                    fill={C.text}
                    fontSize={9.5}
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {n.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Instruction hint */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: `1px solid ${C.border}`,
          background: C.surface,
          fontSize: 10,
          color: C.dim,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Click a node to highlight connections. Drag to reposition.
        {selectedNode && (
          <span style={{ color: C.accent, marginLeft: 8 }}>
            Selected: {selectedNode}
          </span>
        )}
      </div>
    </div>
  );
}
