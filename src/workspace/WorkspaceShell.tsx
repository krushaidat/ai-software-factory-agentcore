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
import { useEventPlayback } from '../hooks/useEventPlayback';
import { getSession } from '../data/sampleSessions';
import type { AgentName } from '../types/agents';
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
import { SubmitSessionModal } from './SubmitSessionModal';

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
  const [submitOpen, setSubmitOpen] = useState(false);

  const rawView = searchParams.get('view');
  const view: ViewId = (rawView && VIEW_IDS.has(rawView as ViewId) ? (rawView as ViewId) : 'pipeline');
  const activeSessionId = searchParams.get('session') || 'pr-1847';

  // Click an existing session row → switch to it in 'frozen' mode (instant view of past run).
  const setSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('session', id);
      params.delete('play'); // frozen view of past session
      setSearchParams(params, { replace: true });
      pipeline.resetRun();
    },
    [searchParams, setSearchParams, pipeline],
  );

  // "+ New session" → create a blank session and open the submit modal.
  const newSession = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('session', `new-${Date.now()}`);
    params.set('view', 'pipeline');
    params.delete('play');
    setSearchParams(params, { replace: true });
    pipeline.resetRun();
    setSubmitOpen(true);
  }, [searchParams, setSearchParams, pipeline]);

  // After user picks a corpus file from the submit modal: switch to that session id
  // and start scripted playback (`?play=1`).
  const startScriptedRun = useCallback(
    (sessionIdToPlay: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('session', sessionIdToPlay);
      params.set('play', '1');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const {
    events: liveEvents,
    reasoningTree: _reasoningTree,
    currentAgent: liveCurrentAgent,
  } = useAgentStream(sessionId);

  // Resolve the active session descriptor. `null` for blank "+ New session" sessions.
  const sessionDesc = useMemo(() => getSession(activeSessionId), [activeSessionId]);

  // playbackMode:
  //  - 'play'   if URL has &play=1 (kicked off by "+ New session" or by clicking a session)
  //  - 'frozen' otherwise — past sessions show their full trace immediately
  const playbackMode = searchParams.get('play') === '1' ? 'play' : 'frozen';

  const playback = useEventPlayback({
    sessionId: activeSessionId,
    source: sessionDesc?.playableEvents ?? [],
    frozen: sessionDesc?.frozenEvents ?? [],
    mode: playbackMode,
    speed: 1.6, // 1.6x so the demo isn't tedious
  });

  // events: prefer live AgentCore events; otherwise use the playback (scripted demo).
  const events = useMemo(
    () => (liveEvents.length > 0 ? liveEvents : playback.events),
    [liveEvents, playback.events],
  );

  // currentAgent: live wins; otherwise playback's computed current agent.
  const currentAgent: AgentName | null = useMemo(
    () => (liveEvents.length > 0 ? liveCurrentAgent : playback.currentAgent),
    [liveEvents, liveCurrentAgent, playback.currentAgent],
  );

  // Mode label for the TopBar badge: "Demo data" while scripted, "Live AgentCore" once real.
  const dataMode: 'demo' | 'live' = liveEvents.length > 0 ? 'live' : 'demo';

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
        return <AgentNetworkView events={events} />;
      case 'reasoning':
        return <ReasoningTraceView events={events} />;
      case 'memory':
        return <MemoryReplayView events={events} />;
      case 'code_interpreter':
        return <CodeInterpreterView events={events} />;
      case 'reports':
        return <ReportsView />;
      default:
        return null;
    }
  }, [view, pipeline, events]);

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
        dataMode={dataMode}
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
        activeSessionId={activeSessionId}
        onSelectSession={setSession}
        onNewSession={newSession}
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
      <SubmitSessionModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onPick={(sid) => startScriptedRun(sid)}
      />
    </div>
  );
}

/** Prefer today's WS-reported total; fall back to the session total. */
function todayCost(todayTotal: number, sessionTotal: number): number {
  if (todayTotal > 0) return todayTotal;
  return sessionTotal;
}
