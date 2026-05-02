import { useMemo } from 'react';
import { C } from '../config/colors';
import { tokens, AGENT_ORDER } from '../design/tokens';
import { GlassCard } from '../design/glass';
import { Icon } from '../design/icons';
import type { AgentEvent, AgentName } from '../types/agents';

interface LeftRailProps {
  width: number;
  topOffset: number;
  bottomOffset: number;
  events: AgentEvent[];
  currentAgent: AgentName | null;
  sessionTotal: number;
  memoryReadCount: number;
  memoryWriteCount: number;
  userPrefCount: number;
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
}

interface SessionItem {
  id: string;
  label: string;
  meta: string;
  isNew?: boolean;
}

const MOCK_SESSIONS: SessionItem[] = [
  { id: 'pr-1847', label: 'PR #1847 — Brake ECU CAN timeout', meta: '2 min ago' },
  { id: 'pr-1845', label: 'PR #1845 — IMU corrector calibration', meta: 'yesterday' },
  { id: 'pr-1840', label: 'PR #1840 — MPC controller tuning', meta: '2 weeks ago' },
];

const PRIMITIVES = [
  'Runtime',
  'Gateway',
  'Identity',
  'Memory',
  'Browser',
  'Code Interpreter',
  'Observability',
];

interface AgentRowState {
  name: AgentName;
  status: 'idle' | 'active' | 'done' | 'failed';
  lastAt?: string;
}

function deriveAgentRoster(
  events: AgentEvent[],
  currentAgent: AgentName | null,
): AgentRowState[] {
  const lastAtByAgent = new Map<AgentName, string>();
  const completed = new Set<AgentName>();
  const failed = new Set<AgentName>();
  const invoked = new Set<AgentName>();

  for (const ev of events) {
    if (ev.timestamp) lastAtByAgent.set(ev.agentName, ev.timestamp);
    if (ev.type === 'agent_invoked') invoked.add(ev.agentName);
    if (ev.type === 'agent_completed') completed.add(ev.agentName);
    if (ev.type === 'agent_failed') failed.add(ev.agentName);
  }

  return AGENT_ORDER.map((name) => {
    let status: AgentRowState['status'] = 'idle';
    if (failed.has(name)) status = 'failed';
    else if (currentAgent === name) status = 'active';
    else if (completed.has(name)) status = 'done';
    else if (invoked.has(name)) status = 'active';
    return { name, status, lastAt: lastAtByAgent.get(name) };
  });
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

function statusColor(status: AgentRowState['status']): string {
  if (status === 'active') return C.accent;
  if (status === 'done') return C.ok;
  if (status === 'failed') return C.crit;
  return C.dim;
}

function CostSparkline({ events, total }: { events: AgentEvent[]; total: number }) {
  const points = useMemo(() => {
    const series: number[] = [];
    let running = 0;
    for (const ev of events) {
      if (ev.type === 'cost_update') {
        const v = ev.payload?.sessionTotal ?? ev.payload?.session_total;
        if (typeof v === 'number') {
          running = v;
          series.push(running);
        }
      } else if (ev.type === 'agent_completed') {
        // Approximate cost growth from token totals.
        const tokens =
          (Number(ev.payload?.tokens_in) || 0) +
          (Number(ev.payload?.tokens_out) || 0);
        running += (tokens / 1000) * 0.003;
        series.push(running);
      }
    }
    if (series.length === 0) series.push(0, 0);
    return series;
  }, [events]);

  const w = 200;
  const h = 36;
  const max = Math.max(...points, 0.0001);
  const stride = points.length > 1 ? w / (points.length - 1) : w;
  const path = points
    .map((v, i) => {
      const x = i * stride;
      const y = h - (v / max) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <path d={path} fill="none" stroke={C.accent} strokeWidth={1.5} />
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 10, color: C.dim }}>session</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        fontSize: 10,
        fontWeight: 600,
        color: C.dim,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      <Icon name={icon} size="sm" color={C.dim} />
      {label}
    </div>
  );
}

export function LeftRail({
  width,
  topOffset,
  bottomOffset,
  events,
  currentAgent,
  sessionTotal,
  memoryReadCount,
  memoryWriteCount,
  userPrefCount,
  activeSessionId = 'pr-1847',
  onSelectSession,
  onNewSession,
}: LeftRailProps) {
  const roster = useMemo(
    () => deriveAgentRoster(events, currentAgent),
    [events, currentAgent],
  );

  return (
    <aside
      style={{
        position: 'fixed',
        top: topOffset,
        bottom: bottomOffset,
        left: 0,
        width,
        padding: 12,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Sessions */}
      <GlassCard padding={14}>
        <SectionHeader icon="history" label="Sessions" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MOCK_SESSIONS.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSession?.(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  border: isActive ? `1px solid ${C.accentBorder}` : '1px solid transparent',
                  background: isActive ? C.accentDim : 'transparent',
                  color: isActive ? C.accent : C.text,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  borderRadius: 8,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.raised; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <Icon name="fileText" size="sm" color={isActive ? C.accent : C.muted} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </span>
                <span style={{ fontSize: 10, color: C.dim, marginLeft: 6, flexShrink: 0 }}>{s.meta}</span>
              </button>
            );
          })}

          {/* New session button (action, not list item) */}
          <button
            onClick={() => onNewSession?.()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              marginTop: 4,
              border: `1px dashed ${C.accentBorder}`,
              background: 'transparent',
              color: C.accent,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 8,
              transition: 'all 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.accentDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon name="plus" size="sm" color={C.accent} />
            New session
          </button>
        </div>
      </GlassCard>

      {/* Memory */}
      <GlassCard padding={14}>
        <SectionHeader icon="database" label="Memory" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MemoryStat label="patterns" value={memoryReadCount} accent={C.info} />
          <MemoryStat label="user prefs" value={userPrefCount} accent={C.purple} />
          <MemoryStat label="new this session" value={memoryWriteCount} accent={C.accent} />
        </div>
      </GlassCard>

      {/* Agents */}
      <GlassCard padding={14}>
        <SectionHeader icon="bot" label="Agents" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {roster.map((row) => (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                background: row.status === 'active' ? C.accentDim : 'transparent',
                border:
                  row.status === 'active'
                    ? `1px solid ${C.accentBorder}`
                    : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tokens.agentColors[row.name],
                    boxShadow:
                      row.status === 'active'
                        ? `0 0 10px ${tokens.agentColors[row.name]}`
                        : 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: C.text }}>
                  {tokens.agentLabels[row.name]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 9,
                    color: statusColor(row.status),
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                  }}
                >
                  {row.status}
                </span>
                <span style={{ fontSize: 10, color: C.dim }}>{relTime(row.lastAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Cost */}
      <GlassCard padding={14}>
        <SectionHeader icon="dollar" label="Session cost" />
        <CostSparkline events={events} total={sessionTotal} />
      </GlassCard>

      {/* Primitives badge */}
      <GlassCard padding={10}>
        <div
          title={PRIMITIVES.join(' \u00B7 ')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            color: C.muted,
          }}
        >
          <Icon name="cpu" size="sm" color={C.accent} />
          <span style={{ fontWeight: 600 }}>{PRIMITIVES.length} primitives active</span>
        </div>
      </GlassCard>
    </aside>
  );
}

function MemoryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</span>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
    </div>
  );
}
