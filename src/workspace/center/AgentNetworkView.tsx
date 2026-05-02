import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../../config/colors';
import { GlassCard } from '../../design/glass';
import { AGENT_ORDER } from '../../design/tokens';
import { Icon } from '../../design/icons';
import { useAgentNetwork } from '../../hooks/useAgentNetwork';
import type { AgentEvent, AgentName, A2AMessage } from '../../types/agents';
import { AgentDrawer } from '../../components/agents/AgentDrawer';
import { agentColor, agentLabel, MONO } from '../../components/agents/agentTraceHelpers';

interface NodePos {
  agent: AgentName;
  x: number; y: number;
  vx: number; vy: number;
  fx: number | null; fy: number | null;
}

interface InFlightParticle {
  id: string;
  from: AgentName; to: AgentName;
  msg: A2AMessage;
  startedAt: number;
}

const WIDTH = 700;
const HEIGHT = 480;
const NODE_R = 28;
const SUPERVISOR_R = 36;

function initialPositions(): NodePos[] {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const ringR = 160;
  const positions: Record<AgentName, [number, number]> = {
    supervisor: [cx, cy - 140],
    quality_agent: [cx - ringR, cy - 40],
    safety_agent: [cx + ringR, cy - 40],
    security_agent: [cx + ringR, cy + 80],
    test_agent: [cx - ringR, cy + 80],
    deployment_agent: [cx - 60, cy + 160],
    integration_agent: [cx + 60, cy + 160],
  };
  return AGENT_ORDER.map((agent) => ({
    agent,
    x: positions[agent][0],
    y: positions[agent][1],
    vx: 0, vy: 0, fx: null, fy: null,
  }));
}

interface AgentNetworkViewProps {
  events?: AgentEvent[];
}

export function AgentNetworkView({ events = [] }: AgentNetworkViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentAgent: AgentName | null = useMemo(() => {
    const last = events[events.length - 1];
    if (last && (last.type === 'agent_thinking' || last.type === 'agent_invoked')) return last.agentName;
    return null;
  }, [events]);
  const { edges: liveEdges } = useAgentNetwork(events);
  const [hideIdle, setHideIdle] = useState(false);
  const [selected, setSelected] = useState<AgentName | null>(null);
  const [hovered, setHovered] = useState<AgentName | null>(null);
  const [particles, setParticles] = useState<InFlightParticle[]>([]);
  const [, forceRender] = useState(0);

  const nodesRef = useRef<NodePos[]>(initialPositions());
  const draggingRef = useRef<AgentName | null>(null);

  const a2aMessages = useMemo(() => events.filter(e => e.type === 'a2a_message'), [events]);

  // Particle GC: drop in-flight particles after 1.5s
  useEffect(() => {
    const id = setInterval(() => {
      setParticles((p) => p.filter(x => Date.now() - x.startedAt < 1500));
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Live a2a messages -> particles
  useEffect(() => {
    if (a2aMessages.length === 0) return;
    const last = a2aMessages[a2aMessages.length - 1];
    const id = `live-${last.spanId}-${last.timestamp}`;
    const payload = last.payload as { from: AgentName; to: AgentName; message: string; purpose: string };
    setParticles((p) => p.find(x => x.id === id) ? p : [...p, {
      id, from: payload.from, to: payload.to, msg: payload, startedAt: Date.now()
    }]);
    const timer = setTimeout(() => setParticles((p) => p.filter(x => x.id !== id)), 1500);
    return () => clearTimeout(timer);
  }, [a2aMessages]);

  // Force simulation
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const nodes = nodesRef.current;
      const repulsion = 3000;
      const damping = 0.7;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = repulsion / (dist * dist);
          dx = (dx / dist) * f;
          dy = (dy / dist) * f;
          a.vx += dx; a.vy += dy;
          b.vx -= dx; b.vy -= dy;
        }
      }
      for (const n of nodes) {
        n.vx += (WIDTH / 2 - n.x) * 0.005;
        n.vy += (HEIGHT / 2 - n.y) * 0.005;
        n.vx *= damping;
        n.vy *= damping;
        if (n.fx == null) n.x += n.vx;
        if (n.fy == null) n.y += n.vy;
        n.x = Math.max(NODE_R + 8, Math.min(WIDTH - NODE_R - 8, n.x));
        n.y = Math.max(NODE_R + 8, Math.min(HEIGHT - NODE_R - 8, n.y));
      }
      forceRender(x => x + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onNodePointerDown = (e: React.PointerEvent<SVGGElement>, agent: AgentName) => {
    draggingRef.current = agent;
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    const node = nodesRef.current.find(n => n.agent === draggingRef.current);
    if (node) { node.fx = x; node.fy = y; node.x = x; node.y = y; }
  };
  const onSvgPointerUp = () => {
    if (!draggingRef.current) return;
    const node = nodesRef.current.find(n => n.agent === draggingRef.current);
    if (node) { node.fx = null; node.fy = null; }
    draggingRef.current = null;
  };

  const getStatus = (agent: AgentName): 'idle' | 'active' | 'done' | 'failed' => {
    if (currentAgent === agent) return 'active';
    const last = events.filter(e => e.agentName === agent).slice(-1)[0];
    if (!last) return 'idle';
    if (last.type === 'agent_failed') return 'failed';
    if (last.type === 'agent_completed' || last.type === 'pipeline_completed') return 'done';
    return 'active';
  };

  const messageCount = a2aMessages.length;
  const activeCount = AGENT_ORDER.filter(a => getStatus(a) === 'active').length;

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)' }}>
      <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="network" size="md" color={C.accent} />
            <div>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Agent Network</div>
              <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>
                7 agents · {messageCount} A2A messages · {activeCount} active
              </div>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideIdle} onChange={(e) => setHideIdle(e.target.checked)} />
            Hide idle agents
          </label>
        </div>

        <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, rgba(14,165,160,0.05), transparent 70%)' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            style={{ width: '100%', height: '100%' }}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
          >
            {liveEdges.map((edge) => {
              const src = nodesRef.current.find(n => n.agent === edge.from);
              const tgt = nodesRef.current.find(n => n.agent === edge.to);
              if (!src || !tgt) return null;
              return (
                <line
                  key={`edge-${edge.from}-${edge.to}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={agentColor(edge.from)}
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                />
              );
            })}

            {particles.map((p) => {
              const src = nodesRef.current.find(n => n.agent === p.from);
              const tgt = nodesRef.current.find(n => n.agent === p.to);
              if (!src || !tgt) return null;
              const elapsed = Date.now() - p.startedAt;
              const t = Math.min(1, elapsed / 800);
              const px = src.x + (tgt.x - src.x) * t;
              const py = src.y + (tgt.y - src.y) * t;
              const opacity = elapsed < 800 ? 1 : Math.max(0, 1 - (elapsed - 800) / 700);
              return (
                <g key={p.id}>
                  <line x1={src.x} y1={src.y} x2={px} y2={py} stroke={agentColor(p.from)} strokeWidth={2} strokeOpacity={opacity * 0.5} />
                  <circle cx={px} cy={py} r={5} fill={agentColor(p.from)} opacity={opacity} />
                  {t > 0.95 && (
                    <circle cx={tgt.x} cy={tgt.y} r={NODE_R + 4} fill="none" stroke={agentColor(p.from)} strokeWidth={2} opacity={opacity * 0.8}>
                      <animate attributeName="r" from={NODE_R + 4} to={NODE_R + 14} dur="0.4s" />
                    </circle>
                  )}
                </g>
              );
            })}

            {nodesRef.current.map((node) => {
              const status = getStatus(node.agent);
              const visible = !hideIdle || status !== 'idle';
              if (!visible) return null;
              const r = node.agent === 'supervisor' ? SUPERVISOR_R : NODE_R;
              const color = agentColor(node.agent);
              const isHovered = hovered === node.agent;
              const isSelected = selected === node.agent;
              return (
                <g
                  key={node.agent}
                  onPointerDown={(e) => onNodePointerDown(e, node.agent)}
                  onClick={() => setSelected(node.agent)}
                  onMouseEnter={() => setHovered(node.agent)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {status === 'active' && (
                    <circle cx={node.x} cy={node.y} r={r + 8} fill={color} opacity={0.2}>
                      <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    fillOpacity={status === 'idle' ? 0.4 : 0.85}
                    stroke={isSelected ? C.text : color}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                  />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" fill={C.text} fontWeight="700" fontSize={r === SUPERVISOR_R ? 16 : 13}>
                    {agentLabel(node.agent).charAt(0)}
                  </text>
                  {status === 'done' && <circle cx={node.x + r * 0.7} cy={node.y - r * 0.7} r={6} fill={C.ok} />}
                  {status === 'failed' && <circle cx={node.x + r * 0.7} cy={node.y - r * 0.7} r={6} fill={C.crit} />}
                  <text x={node.x} y={node.y + r + 14} textAnchor="middle" fill={C.muted} fontSize={10}>
                    {agentLabel(node.agent)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, maxHeight: 140, overflowY: 'auto' }}>
          <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Recent messages</div>
          <AnimatePresence>
            {particles.slice(-5).reverse().map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0' }}
              >
                <span style={{ color: agentColor(p.from), fontWeight: 600 }}>{agentLabel(p.from)}</span>
                <span style={{ color: C.dim }}>→</span>
                <span style={{ color: agentColor(p.to), fontWeight: 600 }}>{agentLabel(p.to)}</span>
                <span style={{ color: C.muted, fontFamily: MONO, fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{p.msg.message.slice(0, 80)}"
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

      <AgentDrawer
        agent={selected}
        events={events}
        status={selected ? getStatus(selected) : 'idle'}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
