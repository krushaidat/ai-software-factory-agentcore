/**
 * Inline display of a single A2A message — used inside the Agent Network
 * drawer (recent sent/received list) and the network's bottom toast strip.
 *
 * Renders sender → receiver pill chips with the message preview and an
 * optional "purpose" tag.
 */

import { motion } from 'framer-motion';
import { C } from '../../config/colors';
import { tokens } from '../../design/tokens';
import type { A2AMessage } from '../../types/agents';

interface AgentMessageProps {
  message: A2AMessage;
  /** ISO timestamp of when this A2A message fired. */
  timestamp?: string;
  /** When true, render in compact one-line mode (used in drawer lists). */
  compact?: boolean;
  /** Optional click handler for jumping to the source span. */
  onClick?: () => void;
}

function relTime(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function AgentChip({ name, color }: { name: keyof typeof tokens.agentLabels; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 6px',
        borderRadius: 6,
        background: `${color}1a`,
        border: `1px solid ${color}55`,
        color,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {tokens.agentLabels[name]}
    </span>
  );
}

export function AgentMessage({ message, timestamp, compact, onClick }: AgentMessageProps) {
  const fromColor = tokens.agentColors[message.from];
  const toColor = tokens.agentColors[message.to];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: tokens.motion.fast }}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: compact ? 'center' : 'stretch',
        gap: compact ? 8 : 6,
        padding: compact ? '6px 8px' : 10,
        borderRadius: 8,
        background: C.surface,
        border: `1px solid ${C.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      whileHover={onClick ? { borderColor: C.accentBorder } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <AgentChip name={message.from} color={fromColor} />
        <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
          <path
            d="M0 5 L10 5 M7 2 L10 5 L7 8"
            stroke={C.muted}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <AgentChip name={message.to} color={toColor} />
        {message.purpose && (
          <span
            style={{
              padding: '1px 5px',
              borderRadius: 4,
              background: C.raised,
              border: `1px solid ${C.border}`,
              color: C.muted,
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {message.purpose.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <div
        style={{
          color: C.text,
          fontSize: compact ? 11 : 12,
          lineHeight: 1.45,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: compact ? 'nowrap' : 'normal',
        }}
        title={message.message}
      >
        {message.message || <span style={{ color: C.dim, fontStyle: 'italic' }}>(no body)</span>}
      </div>

      {timestamp && (
        <div
          style={{
            color: C.dim,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          {relTime(timestamp)}
        </div>
      )}
    </motion.div>
  );
}
