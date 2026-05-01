import { memo } from 'react';
import { C } from '../../config/colors';
import type { ReasoningTreeNode } from '../../services/agentcore-events';
import type { AgentName } from '../../types/agents';
import { tokens } from '../../design/tokens';
import { MONO, truncate } from './agentTraceHelpers';

interface A2AMessageCardProps {
  node: ReasoningTreeNode;
}

const KNOWN_AGENTS = new Set<AgentName>([
  'supervisor',
  'quality_agent',
  'safety_agent',
  'security_agent',
  'test_agent',
  'deployment_agent',
  'integration_agent',
]);

function asAgent(v: unknown, fallback: AgentName): AgentName {
  if (typeof v === 'string' && KNOWN_AGENTS.has(v as AgentName)) return v as AgentName;
  return fallback;
}

function AgentChip({ name }: { name: AgentName }) {
  const color = tokens.agentColors[name];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 6,
        background: `${color}1f`,
        border: `1px solid ${color}55`,
        color,
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: MONO,
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

function A2AMessageCardImpl({ node }: A2AMessageCardProps) {
  const p = (node.payload ?? {}) as Record<string, unknown>;
  const from = asAgent(p.from, node.agentName);
  const to = asAgent(p.to, 'supervisor');
  const message = typeof p.message === 'string' ? (p.message as string) : '';
  const purpose = typeof p.purpose === 'string' ? (p.purpose as string) : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        background: 'rgba(139,92,246,0.06)',
        border: `1px solid ${C.border}`,
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <AgentChip name={from} />
        <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden>
          <path
            d="M0 5 L14 5 M11 1.5 L14 5 L11 8.5"
            stroke={C.muted}
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <AgentChip name={to} />
        {purpose && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: C.raised,
              border: `1px solid ${C.border}`,
              color: C.muted,
              fontSize: 9,
              fontFamily: MONO,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {purpose.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      {message && (
        <div
          style={{
            color: C.text,
            fontSize: 12.5,
            lineHeight: 1.5,
            paddingLeft: 6,
            borderLeft: `2px solid ${tokens.agentColors[from]}66`,
          }}
        >
          &ldquo;{truncate(message, 200)}&rdquo;
        </div>
      )}
    </div>
  );
}

export const A2AMessageCard = memo(A2AMessageCardImpl);
