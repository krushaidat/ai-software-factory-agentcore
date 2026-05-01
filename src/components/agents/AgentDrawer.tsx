/**
 * Slide-in detail panel for a clicked agent in the Network view.
 *
 * Sits on the right edge of the network canvas. Shows: name, description,
 * current task (if active), tools available, memory namespace, recent
 * sent/received A2A messages, and a sparkline of activity over time.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../../config/colors';
import { tokens } from '../../design/tokens';
import { Icon } from '../../design/icons';
import type {
  A2AMessage,
  AgentEvent,
  AgentName,
} from '../../types/agents';
import { AgentMessage } from './AgentMessage';

export interface AgentDrawerProps {
  agent: AgentName | null;
  events: AgentEvent[];
  /** Status from the parent's status map (idle/active/done/failed). */
  status: 'idle' | 'active' | 'done' | 'failed';
  onClose: () => void;
}

interface AgentMeta {
  description: string;
  tools: string[];
  namespace: string;
}

const AGENT_META: Record<AgentName, AgentMeta> = {
  supervisor: {
    description:
      'Coordinates the multi-agent pipeline. Decomposes a PR into specialist tasks, fans out via A2A messaging, and consolidates the final report.',
    tools: ['route_task', 'merge_findings', 'a2a_dispatch', 'memory_summarize'],
    namespace: 'pipeline/<sessionId>',
  },
  quality_agent: {
    description:
      'Static analysis & code quality. Runs MISRA, Sonar, complexity, dead-code, and naming checks against the changed files.',
    tools: ['misra_checker', 'sonar_scan', 'complexity_metrics', 'dead_code'],
    namespace: 'quality/<repo>',
  },
  safety_agent: {
    description:
      'Functional safety (ISO 26262). Validates ASIL evidence, safety goals, and FMEDA traceability for affected requirements.',
    tools: ['asil_evidence', 'fmeda_lookup', 'safety_goal_trace', 'sg_coverage'],
    namespace: 'safety/iso26262',
  },
  security_agent: {
    description:
      'Cyber-security & TARA. Scans dependencies for CVEs and inspects threat models for newly exposed attack surfaces.',
    tools: ['cve_scanner', 'tara_lookup', 'sbom_diff', 'browser:nvd_search'],
    namespace: 'security/tara',
  },
  test_agent: {
    description:
      'Test coverage & gates. Cross-references HIL/SIL coverage against the changed signals and gates promotion.',
    tools: ['hil_coverage', 'sil_coverage', 'mutation_score', 'gate_check'],
    namespace: 'test/coverage',
  },
  deployment_agent: {
    description:
      'Promotion & deployment. Builds artifacts, manages staging/canary deployment, and watches post-deploy telemetry.',
    tools: ['build_artifact', 'promote_canary', 'rollout_monitor'],
    namespace: 'deploy/<env>',
  },
  integration_agent: {
    description:
      'External system integration. Updates Jira/PR, posts to Slack/Teams, syncs Confluence, and patches the deployment manifest.',
    tools: ['jira_update', 'pr_comment', 'slack_post', 'confluence_sync'],
    namespace: 'integration/external',
  },
};

interface DerivedState {
  currentTask: string | null;
  sent: Array<{ msg: A2AMessage; at: string }>;
  received: Array<{ msg: A2AMessage; at: string }>;
  /** 24-bucket sparkline of all events touching this agent. */
  sparkline: number[];
}

function deriveState(events: AgentEvent[], agent: AgentName): DerivedState {
  const sent: Array<{ msg: A2AMessage; at: string }> = [];
  const received: Array<{ msg: A2AMessage; at: string }> = [];
  let currentTask: string | null = null;

  // Sparkline buckets — last 60 seconds, 24 buckets of 2.5s each.
  const buckets = new Array<number>(24).fill(0);
  const now = Date.now();
  const window = 60_000;

  for (const ev of events) {
    if (ev.type === 'a2a_message') {
      const from = ev.payload?.from;
      const to = ev.payload?.to;
      const message: A2AMessage = {
        from,
        to,
        message: typeof ev.payload?.message === 'string' ? ev.payload.message : '',
        purpose: typeof ev.payload?.purpose === 'string' ? ev.payload.purpose : '',
      };
      if (from === agent) sent.push({ msg: message, at: ev.timestamp });
      if (to === agent) received.push({ msg: message, at: ev.timestamp });
    }
    if (ev.agentName === agent && ev.type === 'agent_invoked') {
      const task = ev.payload?.task;
      if (typeof task === 'string') currentTask = task;
    }
    if (ev.agentName === agent && ev.type === 'agent_completed') {
      currentTask = null;
    }

    if (ev.agentName === agent && ev.timestamp) {
      const t = Date.parse(ev.timestamp);
      if (!Number.isNaN(t)) {
        const age = now - t;
        if (age >= 0 && age < window) {
          const idx = Math.min(buckets.length - 1, Math.floor((window - age) / (window / buckets.length)));
          buckets[idx] += 1;
        }
      }
    }
  }

  // Most-recent-first
  sent.reverse();
  received.reverse();
  return {
    currentTask,
    sent: sent.slice(0, 6),
    received: received.slice(0, 6),
    sparkline: buckets,
  };
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 200;
  const h = 36;
  const max = Math.max(...values, 1);
  const stride = values.length > 1 ? w / (values.length - 1) : w;
  const path = values
    .map((v, i) => {
      const x = i * stride;
      const y = h - (v / max) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={path} stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
    </svg>
  );
}

export function AgentDrawer({ agent, events, status, onClose }: AgentDrawerProps) {
  const meta = agent ? AGENT_META[agent] : null;
  const color = agent ? tokens.agentColors[agent] : C.accent;
  const label = agent ? tokens.agentLabels[agent] : '';

  const derived = useMemo<DerivedState | null>(
    () => (agent ? deriveState(events, agent) : null),
    [agent, events],
  );

  return (
    <AnimatePresence>
      {agent && meta && derived && (
        <motion.div
          key="agent-drawer"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            background: tokens.glass.bg,
            backdropFilter: `blur(${tokens.glass.blur})`,
            WebkitBackdropFilter: `blur(${tokens.glass.blur})`,
            borderLeft: `1px solid ${color}55`,
            boxShadow: `-12px 0 32px rgba(0,0,0,0.4)`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 5,
          }}
          role="dialog"
          aria-label={`${label} agent details`}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${color}22`,
                border: `1px solid ${color}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {label.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{label}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: status === 'active' ? C.accent : status === 'done' ? C.ok : status === 'failed' ? C.crit : C.muted,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      status === 'active' ? C.accent : status === 'done' ? C.ok : status === 'failed' ? C.crit : C.dim,
                    boxShadow: status === 'active' ? `0 0 8px ${C.accent}` : 'none',
                  }}
                />
                {status}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                background: 'transparent',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surface)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name="x" size="md" />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Section title="Description">
              <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.55 }}>{meta.description}</p>
            </Section>

            {derived.currentTask && (
              <Section title="Current task" accent>
                <div
                  style={{
                    padding: 10,
                    background: C.accentDim,
                    border: `1px solid ${C.accentBorder}`,
                    borderRadius: 8,
                    color: C.text,
                    fontSize: 12,
                  }}
                >
                  {derived.currentTask}
                </div>
              </Section>
            )}

            <Section title={`Tools (${meta.tools.length})`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {meta.tools.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: '4px 8px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.muted,
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="Memory namespace">
              <code
                style={{
                  display: 'block',
                  padding: '6px 8px',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.muted,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {meta.namespace}
              </code>
            </Section>

            <Section title="Activity (last 60s)">
              <Sparkline values={derived.sparkline} color={color} />
            </Section>

            {derived.sent.length > 0 && (
              <Section title={`Sent (${derived.sent.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {derived.sent.map((s, i) => (
                    <AgentMessage key={`s-${i}`} message={s.msg} timestamp={s.at} compact />
                  ))}
                </div>
              </Section>
            )}

            {derived.received.length > 0 && (
              <Section title={`Received (${derived.received.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {derived.received.map((s, i) => (
                    <AgentMessage key={`r-${i}`} message={s.msg} timestamp={s.at} compact />
                  ))}
                </div>
              </Section>
            )}

            {derived.sent.length === 0 && derived.received.length === 0 && (
              <div
                style={{
                  padding: 12,
                  textAlign: 'center',
                  color: C.dim,
                  fontSize: 11,
                  borderRadius: 8,
                  border: `1px dashed ${C.border}`,
                }}
              >
                No A2A messages yet for this agent.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: accent ? C.accent : C.dim,
          marginBottom: 6,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
