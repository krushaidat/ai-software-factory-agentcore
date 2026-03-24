import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { C } from '../../config/colors';
import { NewBadge, AwsBadge } from '../../components/shared';
import type { Stage } from '../../types';

/* ── types ─────────────────────────────────────────────── */

interface PipelineStripProps {
  stages: Stage[];
  activeId: string | null;
  completed: string[];
  running: boolean;
  onJump: (stageId: string) => void;
  stageTimings?: Record<string, number>;
}

/* ── parallel-branch ids (Option B) ────────────────────── */

const PARALLEL_IDS = new Set(['cybersec', 'safety', 'sbom']);

/* ── helper: elapsed time formatter ────────────────────── */

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ── tooltip ───────────────────────────────────────────── */

interface TooltipProps {
  stage: Stage;
  timing?: number;
  isDone: boolean;
}

function StageTooltip({ stage, timing, isDone }: TooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 10,
        padding: '10px 14px',
        background: C.raised,
        border: `1px solid ${C.borderHi}`,
        borderRadius: 10,
        minWidth: 210,
        maxWidth: 280,
        zIndex: 100,
        pointerEvents: 'none',
        boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 15px ${C.accentDim}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {stage.icon} {stage.name}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{stage.desc}</div>
      <div className="flex flex-wrap gap-1" style={{ marginBottom: 6 }}>
        {stage.aws.map((svc) => (
          <AwsBadge key={svc}>{svc}</AwsBadge>
        ))}
      </div>
      <div style={{ fontSize: 10, color: C.dim }}>
        Bundle: <span style={{ color: C.text, fontWeight: 600 }}>{stage.bundle}</span>
        {isDone && timing != null && (
          <span style={{ marginLeft: 10, color: C.ok }}>
            Duration: {fmtMs(timing)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── elapsed time counter ──────────────────────────────── */

function ElapsedCounter() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{ fontSize: 9, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
      {(elapsed / 1000).toFixed(1)}s
    </span>
  );
}

/* ── spinning loader icon ──────────────────────────────── */

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'pipeline-spin 1s linear infinite' }}>
      <circle cx="7" cy="7" r="5.5" fill="none" stroke={C.accentBorder} strokeWidth="1.5" />
      <path
        d="M7 1.5 A5.5 5.5 0 0 1 12.5 7"
        fill="none"
        stroke={C.accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── SVG flowing connection ────────────────────────────── */

interface ConnectionProps {
  isDone: boolean;
  isNextActive: boolean;
}

function FlowingConnection({ isDone, isNextActive }: ConnectionProps) {
  const color = isDone ? C.ok : isNextActive ? C.accent : C.border;
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${isDone ? 'done' : isNextActive ? 'active' : 'dim'}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="50%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.3} />
        </linearGradient>
      </defs>
      {/* background track */}
      <line x1="0" y1="10" x2="32" y2="10" stroke={C.border} strokeWidth="2" />
      {/* animated flow line */}
      <line
        x1="0"
        y1="10"
        x2="32"
        y2="10"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="4 4"
        style={{
          animation: isDone || isNextActive ? 'pipeline-flow 1s linear infinite' : 'none',
          opacity: isDone || isNextActive ? 1 : 0.3,
        }}
      />
      {/* arrow tip */}
      <polygon
        points="28,6 32,10 28,14"
        fill={color}
        opacity={isDone || isNextActive ? 0.8 : 0.3}
      />
    </svg>
  );
}

/* ── stage card ────────────────────────────────────────── */

interface StageCardProps {
  stage: Stage;
  isDone: boolean;
  isActive: boolean;
  running: boolean;
  timing?: number;
  onClick: () => void;
  isParallel?: boolean;
}

function StageCard({ stage, isDone, isActive, running, timing, onClick, isParallel }: StageCardProps) {
  const [hovered, setHovered] = useState(false);

  let bg: string = C.surface;
  let borderColor: string = C.border;
  let textColor: string = C.dim;
  let iconOpacity = 0.4;
  let glowShadow = 'none';

  if (isDone) {
    bg = C.okDim;
    borderColor = 'rgba(16,185,129,0.4)';
    textColor = C.ok;
    iconOpacity = 1;
    glowShadow = '0 0 12px rgba(16,185,129,0.15)';
  } else if (isActive) {
    bg = C.accentDim;
    borderColor = C.accent;
    textColor = C.accent;
    iconOpacity = 1;
    glowShadow = `0 0 20px ${C.accentDim}, 0 0 40px rgba(14,165,160,0.05)`;
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <AnimatePresence>
        {hovered && (
          <StageTooltip stage={stage} timing={timing} isDone={isDone} />
        )}
      </AnimatePresence>
      <motion.button
        layout
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '10px 12px',
          background: bg,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 12,
          cursor: 'pointer',
          width: 120,
          height: 70,
          transition: 'box-shadow 0.3s, border-color 0.3s, background 0.3s',
          position: 'relative',
          boxShadow: glowShadow,
          ...(isActive && running
            ? { animation: 'pipeline-pulse-border 2s ease-in-out infinite' }
            : {}),
        }}
      >
        {/* icon row */}
        <div className="flex items-center gap-1" style={{ opacity: iconOpacity }}>
          {isDone ? (
            <span style={{ color: C.ok, fontSize: 14 }}>&#10003;</span>
          ) : isActive && running ? (
            <Spinner />
          ) : (
            <span style={{ fontSize: 14 }}>{stage.icon}</span>
          )}
          {isActive && running && <ElapsedCounter />}
        </div>

        {/* name */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.2,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stage.name}
        </div>

        {/* AWS badge (first service only, to fit) */}
        <div style={{ fontSize: 8, opacity: 0.7 }}>
          <AwsBadge>{stage.aws[0]}</AwsBadge>
        </div>

        {/* duration on completed */}
        {isDone && timing != null && (
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: C.ok,
              background: C.bg,
              padding: '0 6px',
              borderRadius: 4,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {fmtMs(timing)}
          </div>
        )}

        {/* new badge */}
        {stage.isNew && (
          <div style={{ position: 'absolute', top: -8, right: -8 }}>
            <NewBadge />
          </div>
        )}

        {/* parallel branch indicator */}
        {isParallel && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: C.purpleDim,
              border: `1px solid rgba(139,92,246,0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: C.purple,
            }}
          >
            &#8896;
          </div>
        )}
      </motion.button>
    </div>
  );
}

/* ── main PipelineStrip ────────────────────────────────── */

export function PipelineStrip({
  stages,
  activeId,
  completed,
  running,
  onJump,
  stageTimings = {},
}: PipelineStripProps) {
  /* split stages into main-line and parallel branches */
  const mainStages = stages.filter((s) => !PARALLEL_IDS.has(s.id));
  const parallelStages = stages.filter((s) => PARALLEL_IDS.has(s.id));
  const hasParallel = parallelStages.length > 0;

  /* find merge/fork points (used for rendering parallel branches) */
  const _lastParallelIdx = Math.max(...parallelStages.map((ps) => stages.indexOf(ps)));
  const _mergeStage = stages[_lastParallelIdx + 1] ?? null;
  const _firstParallelIdx = Math.min(...parallelStages.map((ps) => stages.indexOf(ps)));
  const _forkStage = stages[_firstParallelIdx - 1] ?? null;
  void _mergeStage; void _forkStage;

  /* progress */
  const completedCount = completed.length;
  const totalCount = stages.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const renderCard = useCallback(
    (stage: Stage, isParallel = false) => {
      const isDone = completed.includes(stage.id);
      const isActive = stage.id === activeId;
      return (
        <StageCard
          key={stage.id}
          stage={stage}
          isDone={isDone}
          isActive={isActive}
          running={running}
          timing={stageTimings[stage.id]}
          onClick={() => onJump(stage.id)}
          isParallel={isParallel}
        />
      );
    },
    [completed, activeId, running, stageTimings, onJump],
  );

  const renderConnection = useCallback(
    (fromId: string, toId: string) => {
      const fromDone = completed.includes(fromId);
      const toActive = toId === activeId;
      return <FlowingConnection key={`${fromId}-${toId}`} isDone={fromDone} isNextActive={toActive} />;
    },
    [completed, activeId],
  );

  return (
    <div data-tour="pipeline-strip" style={{ position: 'relative' }}>
      {/* main pipeline row */}
      <div
        className="flex items-center"
        style={{
          overflowX: 'auto',
          padding: '16px 4px 24px 4px',
          gap: 0,
        }}
      >
        {mainStages.map((stage, i) => (
          <Fragment key={stage.id}>
            {renderCard(stage)}
            {i < mainStages.length - 1 && renderConnection(stage.id, mainStages[i + 1].id)}
          </Fragment>
        ))}
      </div>

      {/* parallel branch row (Option B) */}
      {hasParallel && (
        <div style={{ position: 'relative', marginTop: -8 }}>
          {/* fork/merge SVG connectors */}
          <svg
            width="100%"
            height="24"
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: -20, left: 0, right: 0, pointerEvents: 'none', overflow: 'visible' }}
          >
            <line x1="15%" y1="0" x2="15%" y2="24" stroke={C.purple} strokeWidth="1" strokeDasharray="3 3" opacity={0.4} />
            <line x1="85%" y1="0" x2="85%" y2="24" stroke={C.purple} strokeWidth="1" strokeDasharray="3 3" opacity={0.4} />
          </svg>

          <div
            className="flex items-center justify-center"
            style={{
              gap: 0,
              padding: '4px 20px',
              borderTop: `1px dashed rgba(139,92,246,0.2)`,
              borderBottom: `1px dashed rgba(139,92,246,0.2)`,
              background: `linear-gradient(180deg, ${C.purpleDim} 0%, transparent 100%)`,
              borderRadius: 8,
              marginLeft: 40,
              marginRight: 40,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.purple,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginRight: 12,
                whiteSpace: 'nowrap',
              }}
            >
              Parallel
            </div>
            {parallelStages.map((stage, i) => (
              <Fragment key={stage.id}>
                {renderCard(stage, true)}
                {i < parallelStages.length - 1 && renderConnection(stage.id, parallelStages[i + 1].id)}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* progress bar */}
      <div
        style={{
          marginTop: 8,
          height: 3,
          background: C.border,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <motion.div
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${C.accent}, ${C.ok})`,
            borderRadius: 2,
            boxShadow: `0 0 8px ${C.accent}, 0 0 16px ${C.accentDim}`,
          }}
        />
      </div>
      <div
        style={{
          textAlign: 'right',
          fontSize: 10,
          color: C.muted,
          marginTop: 2,
        }}
      >
        {completedCount}/{totalCount} stages
        {completedCount === totalCount && completedCount > 0 && (
          <span style={{ color: C.ok, marginLeft: 6 }}>&#10003; Complete</span>
        )}
      </div>

      {/* keyframe animations */}
      <style>{`
        @keyframes pipeline-flow {
          0% { stroke-dashoffset: 16; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pipeline-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pipeline-pulse-border {
          0%, 100% { border-color: ${C.accent}; box-shadow: 0 0 10px ${C.accentDim}; }
          50% { border-color: ${C.borderHi}; box-shadow: 0 0 25px ${C.accentDim}, 0 0 50px rgba(14,165,160,0.05); }
        }
      `}</style>
    </div>
  );
}
