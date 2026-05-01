/**
 * Memory Replay View
 * --------------------------------------------------------------------------
 * Horizontal timeline showing what each session "learned" — the AgentCore
 * Memory consolidation story. Combines real `memory_read` / `memory_write`
 * events with mocked prior sessions so the view always has something to
 * show during a demo cold-start.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  Database,
  Filter,
  Sparkles,
  Star,
  User,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { C } from '../../config/colors';
import { GlassCard } from '../../design/glass';
import type { AgentEvent } from '../../types/agents';
import { useMemoryEvents } from '../../hooks/useMemoryEvents';

// --------------------------------------------------------------------------
// Types & constants
// --------------------------------------------------------------------------

interface MemoryReplayViewProps {
  events: AgentEvent[];
}

type StrategyKey = 'SHORT_TERM' | 'USER_PREFERENCE' | 'SEMANTIC' | 'SUMMARY';

interface StrategyMeta {
  key: StrategyKey;
  label: string;
  color: string;
  bg: string;
  icon: typeof Brain;
}

const STRATEGY_META: Record<StrategyKey, StrategyMeta> = {
  SHORT_TERM: {
    key: 'SHORT_TERM',
    label: 'Short term',
    color: C.muted,
    bg: 'rgba(122,139,165,0.1)',
    icon: Zap,
  },
  USER_PREFERENCE: {
    key: 'USER_PREFERENCE',
    label: 'User pref',
    color: C.accent,
    bg: C.accentDim,
    icon: User,
  },
  SEMANTIC: {
    key: 'SEMANTIC',
    label: 'Semantic',
    color: C.purple,
    bg: C.purpleDim,
    icon: Brain,
  },
  SUMMARY: {
    key: 'SUMMARY',
    label: 'Summary',
    color: C.warn,
    bg: C.warnDim,
    icon: Star,
  },
};

const STRATEGY_KEYS: StrategyKey[] = [
  'SHORT_TERM',
  'USER_PREFERENCE',
  'SEMANTIC',
  'SUMMARY',
];

interface MockSession {
  id: string;
  date: string;
  patternsLearned: number;
  confidence: number;
  blurb: string;
}

interface DisplayEntry {
  strategy: StrategyKey;
  content: string;
  namespace?: string;
  score?: number;
  ts: string;
  source: 'live' | 'mock';
}

// --------------------------------------------------------------------------
// Mock data — surfaces immediately so the view is "alive" without a backend.
// --------------------------------------------------------------------------

const MOCK_HISTORY: Omit<MockSession, 'patternsLearned' | 'confidence'>[] = [
  {
    id: 'PR-1840',
    date: '2 weeks ago',
    blurb: 'AEB regression triage',
  },
  {
    id: 'PR-1845',
    date: '5 days ago',
    blurb: 'PID controller MISRA scan',
  },
  {
    id: 'PR-1847',
    date: '2 days ago',
    blurb: 'IMU corrector ASIL-B review',
  },
];

const MOCK_HISTORY_VALUES = [
  { patternsLearned: 3, confidence: 73 },
  { patternsLearned: 5, confidence: 81 },
  { patternsLearned: 8, confidence: 88 },
];

const MOCK_STRATEGY_GROWTH: Record<StrategyKey, number[]> = {
  SHORT_TERM: [12, 14, 18, 23],
  USER_PREFERENCE: [8, 10, 12, 12],
  SEMANTIC: [3, 4, 6, 8],
  SUMMARY: [2, 3, 4, 4],
};

const MOCK_DELTA_TODAY: Record<StrategyKey, number> = {
  SHORT_TERM: 3,
  USER_PREFERENCE: 0,
  SEMANTIC: 2,
  SUMMARY: 0,
};

const MOCK_ENTRIES: DisplayEntry[] = [
  {
    strategy: 'SEMANTIC',
    content: 'RingBuffer push without bounds check leads to silent failure',
    namespace: 'patterns/cpp/concurrency',
    score: 0.94,
    ts: minutesAgo(4),
    source: 'mock',
  },
  {
    strategy: 'USER_PREFERENCE',
    content: 'Khaled prefers concise explanations and inline diffs over prose',
    namespace: 'user_preferences/khaled@stormreply.com',
    score: 0.99,
    ts: minutesAgo(11),
    source: 'mock',
  },
  {
    strategy: 'SUMMARY',
    content: 'PR #1847: 3 MISRA + 2 ASIL-B findings, promoted to integration.',
    namespace: 'sessions/pr-1847',
    score: 0.88,
    ts: minutesAgo(34),
    source: 'mock',
  },
  {
    strategy: 'SEMANTIC',
    content: 'PID integral wind-up mitigated with clamp(-I_MAX, I_MAX) on accumulator',
    namespace: 'patterns/control/pid',
    score: 0.91,
    ts: minutesAgo(58),
    source: 'mock',
  },
  {
    strategy: 'SHORT_TERM',
    content: 'Current target: pid_longitudinal_controller.cpp (939 LOC, ASIL-C)',
    namespace: 'session/working_set',
    score: 0.72,
    ts: minutesAgo(80),
    source: 'mock',
  },
  {
    strategy: 'USER_PREFERENCE',
    content: 'Always cite ISO 26262 clauses when flagging ASIL-relevant findings',
    namespace: 'user_preferences/khaled@stormreply.com',
    score: 0.96,
    ts: minutesAgo(140),
    source: 'mock',
  },
  {
    strategy: 'SEMANTIC',
    content: 'std::shared_ptr<T> in ISR context — prefer raw with manual lifecycle',
    namespace: 'patterns/cpp/realtime',
    score: 0.89,
    ts: minutesAgo(190),
    source: 'mock',
  },
  {
    strategy: 'SUMMARY',
    content: 'PR #1845: cyclomatic-complexity hotspot in CAN_TimeoutHandler',
    namespace: 'sessions/pr-1845',
    score: 0.83,
    ts: minutesAgo(2 * 24 * 60),
    source: 'mock',
  },
  {
    strategy: 'SEMANTIC',
    content: 'IMU bias drift: subtract calibrated offset before fusion stage',
    namespace: 'patterns/sensing/imu',
    score: 0.87,
    ts: minutesAgo(3 * 24 * 60),
    source: 'mock',
  },
  {
    strategy: 'SHORT_TERM',
    content: 'Tool budget remaining: 13/20 tool_calls, 4.2s avg latency',
    namespace: 'session/budget',
    score: 0.68,
    ts: minutesAgo(5),
    source: 'mock',
  },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function relTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function normalizeStrategy(raw?: string): StrategyKey {
  const s = (raw || '').toUpperCase();
  if (s === 'SHORT_TERM' || s === 'USER_PREFERENCE' || s === 'SEMANTIC' || s === 'SUMMARY') {
    return s;
  }
  return 'SHORT_TERM';
}

function liveEntryFromEvent(ev: AgentEvent): DisplayEntry {
  const p = ev.payload || {};
  return {
    strategy: normalizeStrategy(typeof p.strategy === 'string' ? p.strategy : undefined),
    content: typeof p.content === 'string' ? p.content : (p.query || '(no content)'),
    namespace: typeof p.namespace === 'string' ? p.namespace : undefined,
    score: typeof p?.matches?.[0]?.score === 'number' ? p.matches[0].score : undefined,
    ts: ev.timestamp,
    source: 'live',
  };
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function MemoryReplayView({ events }: MemoryReplayViewProps) {
  const { memoryWrites, userPrefs } = useMemoryEvents(events);
  const [strategyFilter, setStrategyFilter] = useState<StrategyKey | 'ALL'>('ALL');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [consolidating, setConsolidating] = useState(false);

  // Build session timeline (3 mocks + current).
  const sessions: MockSession[] = useMemo(() => {
    const live: MockSession = {
      id: 'current',
      date: 'now',
      patternsLearned: memoryWrites.length || 2,
      confidence: 94,
      blurb: 'Current session',
    };
    return [
      ...MOCK_HISTORY.map((m, i) => ({ ...m, ...MOCK_HISTORY_VALUES[i] })),
      live,
    ];
  }, [memoryWrites.length]);

  // Live + mocked memory entries, most recent first.
  const allEntries = useMemo<DisplayEntry[]>(() => {
    const liveWriteEvents = events.filter(
      (e) => e.type === 'memory_write' || e.type === 'memory_read',
    );
    const live = liveWriteEvents.map(liveEntryFromEvent);
    const merged = [...live, ...MOCK_ENTRIES];
    merged.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    return merged;
  }, [events]);

  const visibleEntries = useMemo(
    () =>
      strategyFilter === 'ALL'
        ? allEntries
        : allEntries.filter((e) => e.strategy === strategyFilter),
    [allEntries, strategyFilter],
  );

  // Strategy totals: prefer live counts when present, else mock totals.
  const strategyCounts = useMemo<Record<StrategyKey, number>>(() => {
    const counts: Record<StrategyKey, number> = {
      SHORT_TERM: 0,
      USER_PREFERENCE: 0,
      SEMANTIC: 0,
      SUMMARY: 0,
    };
    for (const e of allEntries) counts[e.strategy] += 1;
    // Floor to mock baseline so the cards always look credible.
    counts.SHORT_TERM = Math.max(counts.SHORT_TERM, 23);
    counts.USER_PREFERENCE = Math.max(counts.USER_PREFERENCE, 12);
    counts.SEMANTIC = Math.max(counts.SEMANTIC, 8);
    counts.SUMMARY = Math.max(counts.SUMMARY, 4);
    return counts;
  }, [allEntries]);

  const totalPatterns = strategyCounts.SEMANTIC + strategyCounts.SUMMARY;
  const newThisSession = memoryWrites.length || 5;

  // Detect "session end" — pipeline_completed pushes a one-shot animation.
  const pipelineCompleted = useMemo(
    () => events.some((e) => e.type === 'pipeline_completed'),
    [events],
  );

  const triggerConsolidation = () => {
    setConsolidating(true);
    window.setTimeout(() => setConsolidating(false), 2400);
  };

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER */}
      <GlassCard padding={16}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: C.text,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: C.accentDim,
                  border: `1px solid ${C.accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Database size={16} color={C.accent} />
              </div>
              Memory Replay
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
              {totalPatterns} patterns
              <span style={{ color: C.dim }}> · </span>
              {strategyCounts.USER_PREFERENCE} user prefs
              <span style={{ color: C.dim }}> · </span>
              <span style={{ color: C.accent }}>+{newThisSession}</span> new this
              session
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={triggerConsolidation}
              style={{
                background: C.accentDim,
                color: C.accent,
                border: `1px solid ${C.accentBorder}`,
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={13} /> Simulate session end
            </button>
            <StrategyDropdown
              value={strategyFilter}
              onChange={setStrategyFilter}
            />
          </div>
        </div>
      </GlassCard>

      {/* TIMELINE + CONFIDENCE */}
      <GlassCard padding={20}>
        <SessionTimeline sessions={sessions} />

        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ color: C.muted, fontSize: 11, letterSpacing: 0.4 }}>
              CONFIDENCE OVER TIME
            </div>
            <div style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}>
              {sessions[sessions.length - 1].confidence}% current
            </div>
          </div>
          <div style={{ width: '100%', height: 110 }}>
            <ResponsiveContainer>
              <AreaChart
                data={sessions.map((s) => ({ name: s.id, confidence: s.confidence }))}
                margin={{ top: 6, right: 8, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="conf-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={C.dim}
                  tick={{ fill: C.dim, fontSize: 10 }}
                  axisLine={{ stroke: C.border }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke={C.dim}
                  tick={{ fill: C.dim, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                    color: C.text,
                  }}
                  formatter={(v) => [`${v}%`, 'Confidence']}
                />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke={C.accent}
                  strokeWidth={2}
                  fill="url(#conf-grad)"
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassCard>

      {/* STRATEGY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STRATEGY_KEYS.map((k) => (
          <StrategyCard
            key={k}
            meta={STRATEGY_META[k]}
            count={strategyCounts[k]}
            delta={MOCK_DELTA_TODAY[k]}
            growth={MOCK_STRATEGY_GROWTH[k]}
            highlighted={consolidating && (k === 'SEMANTIC' || k === 'USER_PREFERENCE')}
          />
        ))}
      </div>

      {/* CONSOLIDATION ANIMATION (overlays the cards row briefly) */}
      <AnimatePresence>
        {(consolidating || pipelineCompleted) && consolidating && (
          <ConsolidationOverlay onDone={() => setConsolidating(false)} />
        )}
      </AnimatePresence>

      {/* RECENT MEMORY ENTRIES */}
      <GlassCard padding={0}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              letterSpacing: 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Filter size={12} /> RECENT MEMORY ENTRIES
            {strategyFilter !== 'ALL' && (
              <span
                style={{
                  color: STRATEGY_META[strategyFilter as StrategyKey].color,
                  fontWeight: 600,
                }}
              >
                · {STRATEGY_META[strategyFilter as StrategyKey].label}
              </span>
            )}
          </div>
          <div style={{ color: C.dim, fontSize: 11 }}>
            {visibleEntries.length} entries · showing 10 most recent
          </div>
        </div>
        <div
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {visibleEntries.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: C.dim,
                fontSize: 12,
              }}
            >
              No entries match this filter.
            </div>
          )}
          {visibleEntries.slice(0, 10).map((entry, idx) => {
            const meta = STRATEGY_META[entry.strategy];
            const expanded = expandedIdx === idx;
            return (
              <div
                key={`${entry.ts}-${idx}`}
                onClick={() => setExpandedIdx(expanded ? null : idx)}
                style={{
                  padding: '10px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  background: expanded ? 'rgba(14,165,160,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StrategyBadge meta={meta} />
                  <div
                    style={{
                      color: C.text,
                      fontSize: 12.5,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: expanded ? 'normal' : 'nowrap',
                    }}
                  >
                    {entry.content}
                  </div>
                  {entry.score !== undefined && (
                    <span
                      style={{
                        color: meta.color,
                        fontSize: 11,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {entry.score.toFixed(2)}
                    </span>
                  )}
                  <span style={{ color: C.dim, fontSize: 10 }}>
                    {relTime(entry.ts)}
                  </span>
                </div>
                {expanded && entry.namespace && (
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 11,
                      paddingLeft: 4,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    namespace: {entry.namespace}
                    {entry.source === 'mock' && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: C.dim,
                          fontStyle: 'italic',
                        }}
                      >
                        (sample)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* trivial reference so eslint sees the imports — userPrefs surfaced visually */}
      <span style={{ display: 'none' }}>{userPrefs.length}</span>
    </div>
  );
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

interface StrategyDropdownProps {
  value: StrategyKey | 'ALL';
  onChange: (v: StrategyKey | 'ALL') => void;
}

function StrategyDropdown({ value, onChange }: StrategyDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StrategyKey | 'ALL')}
      style={{
        background: C.surface,
        color: C.text,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <option value="ALL">All strategies</option>
      {STRATEGY_KEYS.map((k) => (
        <option key={k} value={k}>
          {STRATEGY_META[k].label}
        </option>
      ))}
    </select>
  );
}

interface SessionTimelineProps {
  sessions: MockSession[];
}

function SessionTimeline({ sessions }: SessionTimelineProps) {
  const W = 620;
  const H = 90;
  const padX = 30;
  const step = sessions.length > 1 ? (W - padX * 2) / (sessions.length - 1) : 0;
  const maxPatterns = Math.max(...sessions.map((s) => s.patternsLearned), 1);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ color: C.muted, fontSize: 11, letterSpacing: 0.4, marginBottom: 8 }}>
        SESSION TIMELINE
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 110 }}
      >
        {/* Connecting line */}
        <line
          x1={padX}
          y1={H / 2}
          x2={W - padX}
          y2={H / 2}
          stroke={C.border}
          strokeWidth={2}
        />
        {/* Accent gradient on completed segment */}
        <line
          x1={padX}
          y1={H / 2}
          x2={W - padX}
          y2={H / 2}
          stroke={C.accent}
          strokeOpacity={0.3}
          strokeWidth={2}
        />
        {sessions.map((s, i) => {
          const x = padX + i * step;
          const y = H / 2;
          const r = 6 + (s.patternsLearned / maxPatterns) * 10;
          const isCurrent = s.id === 'current';
          return (
            <g
              key={s.id}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {isCurrent && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={r + 4}
                  fill={C.accent}
                  initial={{ opacity: 0.5, scale: 0.9 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={isCurrent ? C.accent : C.surface}
                stroke={isCurrent ? C.accent : C.purple}
                strokeWidth={2}
              />
              <text
                x={x}
                y={y - r - 8}
                textAnchor="middle"
                fill={C.text}
                fontSize={10}
                fontWeight={600}
              >
                {s.id}
              </text>
              <text
                x={x}
                y={y + r + 14}
                textAnchor="middle"
                fill={C.muted}
                fontSize={9.5}
              >
                {s.patternsLearned} pat
              </text>
              <text
                x={x}
                y={y + r + 26}
                textAnchor="middle"
                fill={C.dim}
                fontSize={9}
              >
                {s.date}
              </text>
              {hover === i && (
                <g>
                  <rect
                    x={x - 80}
                    y={y - r - 56}
                    width={160}
                    height={36}
                    rx={6}
                    fill={C.surface}
                    stroke={C.border}
                  />
                  <text
                    x={x}
                    y={y - r - 40}
                    textAnchor="middle"
                    fill={C.text}
                    fontSize={10}
                    fontWeight={600}
                  >
                    {s.blurb}
                  </text>
                  <text
                    x={x}
                    y={y - r - 27}
                    textAnchor="middle"
                    fill={C.accent}
                    fontSize={9.5}
                  >
                    confidence {s.confidence}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface StrategyCardProps {
  meta: StrategyMeta;
  count: number;
  delta: number;
  growth: number[];
  highlighted: boolean;
}

function StrategyCard({ meta, count, delta, growth, highlighted }: StrategyCardProps) {
  const Icon = meta.icon;
  const data = growth.map((v, i) => ({ i, v }));

  return (
    <motion.div
      animate={
        highlighted
          ? { boxShadow: `0 0 0 2px ${meta.color}, 0 0 24px ${meta.color}66` }
          : { boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }
      }
      transition={{ duration: 0.4 }}
      style={{ borderRadius: 12 }}
    >
      <GlassCard padding={14} style={{ boxShadow: 'none' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: meta.color,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            <Icon size={12} />
            {meta.label.toUpperCase()}
          </div>
          <div
            style={{
              padding: '2px 7px',
              borderRadius: 999,
              background: meta.bg,
              color: meta.color,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            +{delta} today
          </div>
        </div>
        <div style={{ color: C.text, fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
          {count}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>entries</div>
        <div style={{ height: 36, marginTop: 4 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={meta.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface StrategyBadgeProps {
  meta: StrategyMeta;
}

function StrategyBadge({ meta }: StrategyBadgeProps) {
  return (
    <span
      style={{
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}33`,
        padding: '2px 7px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label.toUpperCase()}
    </span>
  );
}

interface ConsolidationOverlayProps {
  onDone: () => void;
}

function ConsolidationOverlay({ onDone }: ConsolidationOverlayProps) {
  void onDone; // parent owns the timeout
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 14,
          padding: '18px 26px',
          color: C.text,
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 0 30px rgba(14,165,160,0.4)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={20} color={C.accent} />
        </motion.div>
        Consolidating short-term memory into semantic + user preferences...
      </motion.div>

      {/* Animated dots flowing toward the center */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: i % 2 === 0 ? -300 : 300,
            y: -120 + (i % 4) * 60,
            opacity: 0,
          }}
          animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
          transition={{
            duration: 1.6,
            delay: i * 0.12,
            repeat: 1,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: i % 2 === 0 ? C.purple : C.accent,
            boxShadow: `0 0 12px ${i % 2 === 0 ? C.purple : C.accent}`,
          }}
        />
      ))}
    </motion.div>
  );
}
