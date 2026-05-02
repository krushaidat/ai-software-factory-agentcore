import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { C } from '../../config/colors';
import { tokens } from '../../design/tokens';
import { GlassCard } from '../../design/glass';
import { Icon, type IconName } from '../../design/icons';
import { getSession } from '../../data/sampleSessions';
import type { AgentEvent } from '../../types/agents';

interface OverviewViewProps {
  events: AgentEvent[];
  activeSessionId: string;
}

const HEADLINE_FALLBACK = {
  passRate: 0,
  findingsAutoFixed: 0,
  avgRunTimeSec: 0,
  asilCoverage: 0,
};

const WEEKLY_RUNS = [
  { day: 'Mon', runs: 4 },
  { day: 'Tue', runs: 7 },
  { day: 'Wed', runs: 6 },
  { day: 'Thu', runs: 9 },
  { day: 'Fri', runs: 12 },
  { day: 'Sat', runs: 3 },
  { day: 'Sun', runs: 2 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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
    return new Date(iso).toLocaleTimeString([], { hour12: false });
  } catch {
    return '';
  }
}

function HeroDecor() {
  return (
    <svg
      width="280"
      height="200"
      viewBox="0 0 280 200"
      style={{ flexShrink: 0, opacity: 0.85 }}
      aria-hidden
    >
      <defs>
        <radialGradient id="ovHeroGlow1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ovHeroGlow2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="100" r="80" fill="url(#ovHeroGlow1)" />
      <circle cx="240" cy="60" r="40" fill="url(#ovHeroGlow2)" />
      <circle cx="120" cy="150" r="32" fill="url(#ovHeroGlow2)" />
      <circle cx="200" cy="100" r="60" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />
      <circle cx="200" cy="100" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
    </svg>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{value}</span>
    </div>
  );
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
  delta,
  positive = true,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
}) {
  return (
    <motion.div variants={cardVariants}>
      <GlassCard padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${iconColor}1f`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size="md" color={iconColor} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 12,
              background: positive ? C.okDim : C.critDim,
              color: positive ? C.ok : C.crit,
            }}
          >
            {positive ? '\u2191' : '\u2193'} {delta}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{value}</span>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ComplianceRing({ percent }: { percent: number }) {
  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ovComplianceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8c57ff" />
            <stop offset="100%" stopColor="#a08cff" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.border}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ovComplianceGradient)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 30, fontWeight: 700, color: C.text }}>
          {clamped.toFixed(0)}%
        </span>
        <span style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Auto-fixed
        </span>
      </div>
    </div>
  );
}

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: tokens.shadows.card,
        fontSize: 12,
      }}
    >
      <div style={{ color: C.muted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: C.accent, fontWeight: 700 }}>{payload[0].value} runs</div>
    </div>
  );
}

export function OverviewView({ events, activeSessionId }: OverviewViewProps) {
  const session = useMemo(() => getSession(activeSessionId), [activeSessionId]);
  const headline = session?.headline ?? HEADLINE_FALLBACK;

  // Stat 1 — total tokens used (sum of tokens_in + tokens_out from agent_completed)
  const tokensUsed = useMemo(() => {
    let total = 0;
    for (const ev of events) {
      if (ev.type === 'agent_completed') {
        total += Number(ev.payload?.tokens_in) || 0;
        total += Number(ev.payload?.tokens_out) || 0;
      }
    }
    return total;
  }, [events]);

  // Stat 2 — active runs
  const activeRuns = useMemo(() => {
    if (events.length === 0) return 0;
    let started = 0;
    let completed = 0;
    for (const ev of events) {
      if (ev.type === 'pipeline_started') started++;
      if (ev.type === 'pipeline_completed') completed++;
    }
    const open = started - completed;
    return open > 0 ? open : 1; // demo: at least 1 if any event
  }, [events]);

  // Stat 3 — avg run time (from pipeline_completed durations)
  const avgRunTimeLabel = useMemo(() => {
    const durations: number[] = [];
    for (const ev of events) {
      if (ev.type === 'pipeline_completed') {
        const d = Number(ev.payload?.duration_ms);
        if (!Number.isNaN(d) && d > 0) durations.push(d);
      }
    }
    if (durations.length === 0) return '\u2014';
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    return `${(avgMs / 1000).toFixed(1)}s`;
  }, [events]);

  // Stat 4 — cost saved vs manual (mock: $47 per run)
  const runCount = useMemo(
    () => events.filter((e) => e.type === 'pipeline_completed').length || 1,
    [events],
  );
  const costSaved = `$${runCount * 47}`;

  // Compliance breakdown — derive from events when present
  const breakdown = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let advisory = 0;
    let autoFixed = 0;
    for (const ev of events) {
      if (ev.type === 'tool_result') {
        const findings = ev.payload?.result?.findings;
        if (Array.isArray(findings)) {
          for (const f of findings) {
            if (f?.severity === 'critical') critical++;
            else if (f?.severity === 'warning') warning++;
            else if (f?.severity === 'advisory') advisory++;
          }
        }
      }
      if (ev.type === 'agent_completed') {
        const af = Number(ev.payload?.result?.auto_fixed);
        if (!Number.isNaN(af) && af > 0) autoFixed += af;
      }
    }
    if (!critical && !warning && !advisory && !autoFixed) {
      // fallback hardcoded breakdown for demo when events haven't loaded
      return { critical: 0, warning: 1, advisory: 2, autoFixed: headline.findingsAutoFixed || 1 };
    }
    return { critical, warning, advisory, autoFixed: autoFixed || headline.findingsAutoFixed };
  }, [events, headline.findingsAutoFixed]);

  const recentEvents = useMemo(() => events.slice(-10).reverse(), [events]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Row 1 — Hero card */}
      <motion.div variants={cardVariants}>
        <GlassCard
          gradient="heroPurple"
          padding={28}
          style={{
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            color: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minWidth: 0 }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Pipeline analytics
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: 6,
                  lineHeight: 1.15,
                }}
              >
                Total {headline.passRate}% pass rate
              </div>
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <HeroStat label="Findings" value={String(breakdown.critical + breakdown.warning + breakdown.advisory)} />
              <HeroStat label="Auto-fixes" value={String(headline.findingsAutoFixed)} />
              <HeroStat label="Avg run" value={`${headline.avgRunTimeSec}s`} />
              <HeroStat label="ASIL coverage" value={`${headline.asilCoverage}%`} />
            </div>
          </div>
          <HeroDecor />
        </GlassCard>
      </motion.div>

      {/* Row 2 — 4-column stat grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
          gap: 20,
        }}
      >
        <StatCard
          icon="zap"
          iconColor={C.accent}
          label="Tokens used"
          value={tokensUsed.toLocaleString()}
          delta="12.4%"
          positive
        />
        <StatCard
          icon="activity"
          iconColor={C.info}
          label="Active runs"
          value={String(activeRuns)}
          delta="2.1%"
          positive={false}
        />
        <StatCard
          icon="history"
          iconColor={C.warn}
          label="Avg run time"
          value={avgRunTimeLabel}
          delta="18%"
          positive
        />
        <StatCard
          icon="dollar"
          iconColor={C.ok}
          label="Cost saved vs manual"
          value={costSaved}
          delta="24%"
          positive
        />
      </div>

      {/* Row 3 — 60/40 split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 20,
        }}
      >
        <motion.div variants={cardVariants}>
          <GlassCard padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  Pipeline runs
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  Last 7 days
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: C.okDim,
                  color: C.ok,
                }}
              >
                {'\u2191'} +14%
              </span>
            </div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_RUNS} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={C.muted}
                    axisLine={false}
                    tickLine={false}
                    style={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke={C.muted}
                    axisLine={false}
                    tickLine={false}
                    style={{ fontSize: 11 }}
                  />
                  <Tooltip cursor={{ fill: C.accentDim }} content={<TooltipBox />} />
                  <Bar dataKey="runs" fill={C.accent} radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <GlassCard padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                Compliance status
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                Findings auto-fixed
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <ComplianceRing percent={headline.passRate} />
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: C.muted,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: C.crit, fontWeight: 600 }}>Critical: {breakdown.critical}</span>
              {' \u00b7 '}
              <span style={{ color: C.warn, fontWeight: 600 }}>Warning: {breakdown.warning}</span>
              {' \u00b7 '}
              <span style={{ color: C.info, fontWeight: 600 }}>Advisory: {breakdown.advisory}</span>
              {' \u00b7 '}
              <span style={{ color: C.ok, fontWeight: 600 }}>Auto-fixed: {breakdown.autoFixed}</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Row 4 — Live activity feed */}
      <motion.div variants={cardVariants}>
        <GlassCard padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                Live agent activity
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                Most recent {recentEvents.length} events
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: C.accent,
                  boxShadow: `0 0 10px ${C.accent}`,
                }}
              />
              Live
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {recentEvents.length === 0 && (
              <div style={{ color: C.dim, fontSize: 12, padding: '8px 0' }}>
                Waiting for agent events...
              </div>
            )}
            {recentEvents.map((ev, idx) => {
              const color = tokens.agentColors[ev.agentName];
              return (
                <div
                  key={`${ev.spanId}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: `${color}10`,
                    border: `1px solid ${C.border}`,
                    fontSize: 11.5,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color, fontWeight: 600, minWidth: 90 }}>
                    [{tokens.agentLabels[ev.agentName]}]
                  </span>
                  <span style={{ color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {eventLabel(ev)}
                  </span>
                  <span style={{ color: C.dim, fontSize: 10.5, flexShrink: 0 }}>
                    {fmtTime(ev.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
