import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { C } from '../config/colors';
import { Icon, type IconName } from '../design/icons';
import { GlassCard } from '../design/glass';
import { useAuth } from '../hooks/useAuth';
import { usePipelineLive } from '../hooks/usePipelineLive';
import { useAgentStream } from '../hooks/useAgentStream';
import { useMemoryEvents } from '../hooks/useMemoryEvents';
import { useCostTracker } from '../hooks/useCostTracker';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { RightRail } from './RightRail';
import { BottomTicker } from './BottomTicker';
import { PipelineView } from './center/PipelineView';
import { ReportsView } from './center/ReportsView';
import { AgentNetworkView } from './center/AgentNetworkView';
import { ReasoningTraceView } from './center/ReasoningTraceView';
import { MemoryReplayView } from './center/MemoryReplayView';
import { CodeInterpreterView } from './center/CodeInterpreterView';
import { CommandPalette } from '../components/shared/CommandPalette';
import { ToastNotification } from '../components/shared/ToastNotification';
import { TourOverlay } from '../components/tour/TourOverlay';

const TOP_BAR_HEIGHT = 52;
const BOTTOM_TICKER_HEIGHT = 40;
const LEFT_RAIL_WIDTH = 240;
const RIGHT_RAIL_WIDTH = 380;

type ViewId =
  | 'pipeline'
  | 'agents'
  | 'reasoning'
  | 'memory'
  | 'code_interpreter'
  | 'reports';

const VIEWS: { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: 'zap' },
  { id: 'agents', label: 'Agents', icon: 'network' },
  { id: 'reasoning', label: 'Reasoning', icon: 'brainCircuit' },
  { id: 'memory', label: 'Memory', icon: 'database' },
  { id: 'code_interpreter', label: 'Code', icon: 'terminal' },
  { id: 'reports', label: 'Reports', icon: 'fileText' },
];

const VIEW_IDS: ReadonlySet<ViewId> = new Set<ViewId>(VIEWS.map((v) => v.id));

function getSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const sessionId = getSessionId();

export function WorkspaceShell() {
  const pipeline = usePipelineLive();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  const rawView = searchParams.get('view');
  const view: ViewId = (rawView && VIEW_IDS.has(rawView as ViewId) ? (rawView as ViewId) : 'pipeline');

  const {
    events,
    reasoningTree: _reasoningTree,
    currentAgent,
  } = useAgentStream(sessionId);
  const { memoryReads, memoryWrites, userPrefs } = useMemoryEvents(events);
  const { sessionTotal, todayTotal } = useCostTracker(events);

  // Suppress lint warnings for the parts threaded into deeper feature views later.
  void _reasoningTree;
  void user;

  // Cmd+K — keep parity with previous AppShell.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const setView = useCallback(
    (next: ViewId) => {
      const params = new URLSearchParams(searchParams);
      params.set('view', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSelectSpan = useCallback(
    (_spanId: string) => {
      // Routes to the reasoning trace tab. The deep span scroll lands when
      // ReasoningTraceView ships (feature 1).
      setView('reasoning');
    },
    [setView],
  );

  const centerContent = useMemo(() => {
    switch (view) {
      case 'pipeline':
        return <PipelineView pipeline={pipeline} />;
      case 'agents':
        return <AgentNetworkView />;
      case 'reasoning':
        return <ReasoningTraceView />;
      case 'memory':
        return <MemoryReplayView />;
      case 'code_interpreter':
        return <CodeInterpreterView />;
      case 'reports':
        return <ReportsView />;
      default:
        return null;
    }
  }, [view, pipeline]);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft accent gradient for depth */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 0%, rgba(14,165,160,0.08), transparent 50%), radial-gradient(circle at 80% 100%, rgba(139,92,246,0.05), transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <TopBar
        height={TOP_BAR_HEIGHT}
        todayCost={todayCost(todayTotal, sessionTotal)}
        onOpenCommandPalette={() => setCmdPaletteOpen(true)}
      />

      <LeftRail
        width={LEFT_RAIL_WIDTH}
        topOffset={TOP_BAR_HEIGHT}
        bottomOffset={BOTTOM_TICKER_HEIGHT}
        events={events}
        currentAgent={currentAgent}
        sessionTotal={sessionTotal}
        memoryReadCount={memoryReads.length}
        memoryWriteCount={memoryWrites.length}
        userPrefCount={userPrefs.length}
      />

      {/* Center workspace */}
      <main
        style={{
          marginLeft: LEFT_RAIL_WIDTH,
          marginRight: RIGHT_RAIL_WIDTH,
          paddingTop: TOP_BAR_HEIGHT + 12,
          paddingBottom: BOTTOM_TICKER_HEIGHT + 12,
          paddingLeft: 16,
          paddingRight: 16,
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        {/* Tab bar */}
        <GlassCard
          padding={6}
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 14,
            width: 'fit-content',
          }}
        >
          {VIEWS.map((v) => {
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: 'none',
                  background: isActive ? C.accentDim : 'transparent',
                  color: isActive ? C.accent : C.muted,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = C.muted;
                }}
              >
                <Icon name={v.icon} size="sm" />
                {v.label}
              </button>
            );
          })}
        </GlassCard>

        {/* Active view */}
        <div>{centerContent}</div>
      </main>

      <RightRail
        width={RIGHT_RAIL_WIDTH}
        topOffset={TOP_BAR_HEIGHT}
        bottomOffset={BOTTOM_TICKER_HEIGHT}
        sessionId={sessionId}
      />

      <BottomTicker
        height={BOTTOM_TICKER_HEIGHT}
        leftOffset={0}
        rightOffset={0}
        events={events}
        onSelectSpan={handleSelectSpan}
      />

      <ToastNotification />
      <TourOverlay />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenCopilot={() => setView('reasoning')}
      />
    </div>
  );
}

/** Prefer today's WS-reported total; fall back to the session total. */
function todayCost(todayTotal: number, sessionTotal: number): number {
  if (todayTotal > 0) return todayTotal;
  return sessionTotal;
}
