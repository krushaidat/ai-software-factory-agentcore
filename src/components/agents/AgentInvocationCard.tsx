import { memo } from 'react';
import { C } from '../../config/colors';
import type { ReasoningTreeNode } from '../../services/agentcore-events';
import { agentColor, agentLabel, fmtMs, MONO } from './agentTraceHelpers';

interface AgentInvocationCardProps {
  node: ReasoningTreeNode;
}

/** Pill body for `agent_invoked` / `agent_completed` / `agent_failed` nodes. */
function AgentInvocationCardImpl({ node }: AgentInvocationCardProps) {
  const color = agentColor(node.agentName);
  const label = agentLabel(node.agentName);
  const p = (node.payload ?? {}) as Record<string, unknown>;

  const task = typeof p.task === 'string' ? (p.task as string) : '';
  const tokensIn = typeof p.tokens_in === 'number' ? (p.tokens_in as number) : null;
  const tokensOut = typeof p.tokens_out === 'number' ? (p.tokens_out as number) : null;
  const error = typeof p.error === 'string' ? (p.error as string) : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        minHeight: 22,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          background: `${color}20`,
          border: `1px solid ${color}55`,
          borderRadius: 6,
          color,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: MONO,
          letterSpacing: '0.02em',
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
        {label}
      </div>

      {task && (
        <span style={{ color: C.text, fontSize: 13 }}>{task}</span>
      )}

      {error && (
        <span style={{ color: C.crit, fontSize: 12, fontFamily: MONO }}>
          error: {error}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {node.durationMs !== undefined && (
        <span style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>
          {fmtMs(node.durationMs)}
        </span>
      )}

      {(tokensIn !== null || tokensOut !== null) && (
        <span
          style={{
            color: C.dim,
            fontSize: 10,
            fontFamily: MONO,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: '1px 6px',
          }}
          title="Bedrock tokens (in / out)"
        >
          {tokensIn ?? 0}↓ {tokensOut ?? 0}↑
        </span>
      )}
    </div>
  );
}

export const AgentInvocationCard = memo(AgentInvocationCardImpl);
