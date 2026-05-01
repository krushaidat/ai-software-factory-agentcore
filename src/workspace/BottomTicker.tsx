import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../config/colors';
import { tokens } from '../design/tokens';
import type { AgentEvent } from '../types/agents';

interface BottomTickerProps {
  height: number;
  leftOffset: number;
  rightOffset: number;
  events: AgentEvent[];
  /** Click an event row to inspect the underlying span. */
  onSelectSpan: (spanId: string) => void;
}

function eventLabel(ev: AgentEvent): string {
  const p = ev.payload || {};
  switch (ev.type) {
    case 'tool_call':
      return `tool_call: ${p.tool_name ?? 'unknown'}`;
    case 'tool_result':
      return `tool_result (${p.duration_ms ?? '?'} ms)`;
    case 'a2a_message':
      return `a2a: ${p.from} \u2192 ${p.to}`;
    case 'agent_invoked':
      return `invoked: ${p.task ?? '\u2014'}`;
    case 'agent_completed':
      return `completed (${p.duration_ms ?? '?'} ms)`;
    case 'agent_failed':
      return `failed: ${p.error ?? ''}`;
    case 'memory_read':
      return `memory_read (${p.strategy ?? '-'})`;
    case 'memory_write':
      return `memory_write (${p.strategy ?? '-'})`;
    case 'code_execution':
      return `code_execution (${p.language ?? 'python'})`;
    case 'browser_action':
      return `browser: ${p.action ?? ''}`;
    case 'pipeline_started':
      return 'pipeline_started';
    case 'pipeline_completed':
      return 'pipeline_completed';
    case 'pipeline_failed':
      return 'pipeline_failed';
    case 'cost_update':
      return `cost: $${(p.session_total ?? p.sessionTotal ?? 0).toFixed?.(2) ?? '?'}`;
    default:
      return ev.type;
  }
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour12: false });
  } catch {
    return '';
  }
}

export function BottomTicker({
  height,
  leftOffset,
  rightOffset,
  events,
  onSelectSpan,
}: BottomTickerProps) {
  const recent = useMemo(() => events.slice(-5).reverse(), [events]);
  const [hovered, setHovered] = useState<string | null>(null);
  const lastSpanRef = useRef<string | null>(null);

  useEffect(() => {
    if (recent.length > 0) {
      lastSpanRef.current = recent[0].spanId;
    }
  }, [recent]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: leftOffset,
        right: rightOffset,
        height,
        background: tokens.glass.bg,
        backdropFilter: `blur(${tokens.glass.blur})`,
        WebkitBackdropFilter: `blur(${tokens.glass.blur})`,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 14px',
        overflowX: 'auto',
        overflowY: 'hidden',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: C.dim,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 10px ${C.accent}`,
          }}
        />
        Live activity
      </div>
      {recent.length === 0 && (
        <span style={{ color: C.dim, fontSize: 11 }}>Waiting for agent events...</span>
      )}
      {recent.map((ev, idx) => {
        const isLatest = idx === 0;
        const color = tokens.agentColors[ev.agentName];
        const label = eventLabel(ev);
        const detailsTitle = `${fmtTime(ev.timestamp)} \u2022 ${tokens.agentLabels[ev.agentName]} \u2022 spanId ${ev.spanId}`;
        return (
          <motion.button
            key={`${ev.spanId}-${idx}`}
            initial={isLatest ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: tokens.motion.fast }}
            onMouseEnter={() => setHovered(`${ev.spanId}-${idx}`)}
            onMouseLeave={() => setHovered((h) => (h === `${ev.spanId}-${idx}` ? null : h))}
            onClick={() => ev.spanId && onSelectSpan(ev.spanId)}
            title={detailsTitle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              border: `1px solid ${hovered === `${ev.spanId}-${idx}` ? color : C.border}`,
              borderRadius: 14,
              background: `${color}10`,
              color: C.text,
              cursor: ev.spanId ? 'pointer' : 'default',
              flexShrink: 0,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
              }}
            />
            <span style={{ color, fontWeight: 600 }}>
              [{tokens.agentLabels[ev.agentName]}]
            </span>
            <span style={{ color: C.muted }}>{label}</span>
            <span style={{ color: C.dim, fontSize: 10 }}>{fmtTime(ev.timestamp)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
