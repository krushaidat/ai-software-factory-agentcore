import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../../config/colors';
import { GlassCard } from '../../design/glass';
import { tokens } from '../../design/tokens';
import { Icon } from '../../design/icons';
import { SAMPLE_EVENTS } from '../../data/sampleTrace';
import { buildReasoningTree, type ReasoningTreeNode } from '../../services/agentcore-events';
import type { AgentEvent, AgentName } from '../../types/agents';
import { AgentInvocationCard } from '../../components/agents/AgentInvocationCard';
import { ToolCallCard } from '../../components/agents/ToolCallCard';
import { A2AMessageCard } from '../../components/agents/A2AMessageCard';
import { StreamingThought } from '../../components/agents/StreamingThought';
import { fmtMs, fmtTime, agentColor, agentLabel, MONO } from '../../components/agents/agentTraceHelpers';

interface ReasoningTraceViewProps {
  events?: AgentEvent[];
  selectedSpanId?: string | null;
  onClearSelectedSpan?: () => void;
}

export function ReasoningTraceView({ events: propEvents = [], selectedSpanId, onClearSelectedSpan }: ReasoningTraceViewProps) {
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Use sample events whenever no real events have arrived, regardless of isLive.
  // This keeps the demo populated before AgentCore is fully wired.
  const events: AgentEvent[] = useMemo(() => {
    if (propEvents.length > 0) return propEvents;
    return SAMPLE_EVENTS;
  }, [propEvents]);

  const tree = useMemo<ReasoningTreeNode[]>(() => buildReasoningTree(events), [events]);

  const currentAgent: AgentName | null = useMemo(() => {
    const last = events[events.length - 1];
    if (!last) return null;
    if (last.type === 'agent_thinking' || last.type === 'agent_invoked') return last.agentName;
    return null;
  }, [events]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (paused) return;
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [events.length, paused]);

  // Scroll to selected span
  useEffect(() => {
    if (!selectedSpanId) return;
    const el = document.querySelector(`[data-span-id="${selectedSpanId}"]`) as HTMLElement | null;
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedSpanId]);

  const stats = useMemo(() => {
    const tokensIn = events.reduce((sum, e) => sum + (e.payload?.tokens_in || 0), 0);
    const tokensOut = events.reduce((sum, e) => sum + (e.payload?.tokens_out || 0), 0);
    const durations = events.filter(e => e.type === 'agent_completed').map(e => e.payload?.duration_ms || 0);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    return { tokensIn, tokensOut, totalDuration, eventCount: events.length };
  }, [events]);

  if (events.length === 0) {
    return (
      <GlassCard style={{ padding: 48, textAlign: 'center' }}>
        <Icon name="brainCircuit" size="xl" color={C.dim} />
        <div style={{ color: C.muted, marginTop: 16, fontSize: 14 }}>
          No agent activity yet. Submit a code analysis to see live reasoning.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="brainCircuit" size="md" color={C.accent} />
          <div>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Reasoning Trace</div>
            <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>
              {stats.eventCount} events · {stats.tokensIn + stats.tokensOut} tokens · {fmtMs(stats.totalDuration)}
              {currentAgent && <> · <span style={{ color: agentColor(currentAgent) }}>{agentLabel(currentAgent)} thinking</span></>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            style={{ padding: '5px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, width: 140, outline: 'none' }}
          />
          <button onClick={() => setPaused(p => !p)} style={{ padding: '5px 10px', fontSize: 11, background: paused ? C.warnDim : 'transparent', border: `1px solid ${paused ? C.warn : C.border}`, color: paused ? C.warn : C.muted, borderRadius: 5, cursor: 'pointer' }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: paused ? C.warn : C.ok, padding: '3px 8px', background: paused ? C.warnDim : C.okDim, borderRadius: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: paused ? C.warn : C.ok, animation: paused ? 'none' : 'pulse 1.5s infinite' }} />
            {paused ? 'PAUSED' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Tree */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }} onClick={() => onClearSelectedSpan?.()}>
        <AnimatePresence>
          {tree.filter(n => !filter || JSON.stringify(n).toLowerCase().includes(filter.toLowerCase())).map((node) => (
            <TreeNode key={node.spanId} node={node} depth={0} selectedSpanId={selectedSpanId} />
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </GlassCard>
  );
}

function TreeNode({ node, depth, selectedSpanId }: { node: ReasoningTreeNode; depth: number; selectedSpanId?: string | null }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = node.spanId === selectedSpanId;
  const color = agentColor(node.agentName);
  const hasChildren = node.children.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      data-span-id={node.spanId}
      style={{ marginBottom: 6 }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          padding: '6px 10px',
          marginLeft: depth * 22,
          background: isSelected ? tokens.glass.bg : 'transparent',
          borderLeft: `3px solid ${color}`,
          borderRadius: 4,
          cursor: hasChildren ? 'pointer' : 'default',
          boxShadow: isSelected ? tokens.shadows.glow : 'none',
        }}
      >
        {/* Expand chevron */}
        {hasChildren && (
          <span style={{ color: C.dim, fontSize: 10, width: 12, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
        )}
        {!hasChildren && <span style={{ width: 12 }} />}

        {/* Status icon */}
        <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: node.status === 'running' ? color : node.status === 'completed' ? C.ok : node.status === 'failed' ? C.crit : C.dim, animation: node.status === 'running' ? 'pulse 1.5s infinite' : 'none' }} />

        {/* Node content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <NodeBody node={node} />
          <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, marginTop: 2 }}>
            {fmtTime(node.timestamp)} · {node.spanId.slice(0, 12)}
            {node.durationMs ? ` · ${fmtMs(node.durationMs)}` : ''}
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div style={{ marginLeft: 8 }}>
          {node.children.map((child) => (
            <TreeNode key={child.spanId} node={child} depth={depth + 1} selectedSpanId={selectedSpanId} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function NodeBody({ node }: { node: ReasoningTreeNode }) {
  switch (node.type) {
    case 'agent_invoked':
    case 'agent_completed':
    case 'agent_failed':
      return <AgentInvocationCard node={node} />;
    case 'tool_call':
    case 'tool_result':
      return <ToolCallCard node={node} />;
    case 'a2a_message':
      return <A2AMessageCard node={node} />;
    case 'agent_thinking':
      return <StreamingThought text={String(node.payload?.delta || node.payload?.text || '')} streaming={node.status === 'running'} />;
    case 'memory_read':
      return (
        <div style={{ color: C.text, fontSize: 12 }}>
          <span style={{ color: C.purple, fontWeight: 600, marginRight: 6 }}>memory_read</span>
          <span style={{ color: C.muted, fontFamily: MONO, fontSize: 11 }}>{(node.payload?.strategy || '?')}: "{(node.payload?.query || '').slice(0, 60)}"</span>
          {node.payload?.matches && (
            <span style={{ color: C.dim, fontSize: 11, marginLeft: 8 }}>{node.payload.matches.length} matches</span>
          )}
        </div>
      );
    case 'memory_write':
      return (
        <div style={{ color: C.text, fontSize: 12 }}>
          <span style={{ color: C.purple, fontWeight: 600, marginRight: 6 }}>memory_write</span>
          <span style={{ color: C.muted, fontSize: 11 }}>{(node.payload?.strategy || '?')}: "{(node.payload?.content || '').slice(0, 80)}"</span>
        </div>
      );
    case 'code_execution':
      return (
        <div style={{ color: C.text, fontSize: 12 }}>
          <span style={{ color: C.warn, fontWeight: 600, marginRight: 6 }}>code_execution</span>
          <span style={{ color: C.muted, fontSize: 11 }}>{node.payload?.language}: {(node.payload?.code || '').slice(0, 60).replace(/\n/g, ' ')}</span>
        </div>
      );
    case 'browser_action':
      return (
        <div style={{ color: C.text, fontSize: 12 }}>
          <span style={{ color: C.info, fontWeight: 600, marginRight: 6 }}>browser_action</span>
          <span style={{ color: C.muted, fontSize: 11 }}>{node.payload?.action}: {node.payload?.url}</span>
        </div>
      );
    case 'pipeline_started':
      return <div style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>▶ Pipeline started · {node.payload?.fileId || node.payload?.fileContent?.slice(0, 40)}</div>;
    case 'pipeline_completed':
      return <div style={{ color: C.ok, fontSize: 12, fontWeight: 600 }}>✓ Pipeline complete · {fmtMs(node.payload?.duration_ms)} · ${(node.payload?.totalCost || 0).toFixed(3)}</div>;
    case 'pipeline_failed':
      return <div style={{ color: C.crit, fontSize: 12, fontWeight: 600 }}>✗ Pipeline failed · {node.payload?.error}</div>;
    default:
      return <div style={{ color: C.text, fontSize: 12 }}>{node.type}</div>;
  }
}
