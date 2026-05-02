import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { C } from '../config/colors';
import { type IconName } from '../design/icons';
import { useAuth } from '../hooks/useAuth';
import { usePipelineLive } from '../hooks/usePipelineLive';
import { useAgentStream } from '../hooks/useAgentStream';
import { useCostTracker } from '../hooks/useCostTracker';
import { useEventPlayback } from '../hooks/useEventPlayback';
import { getSession } from '../data/sampleSessions';
import type { AgentName } from '../types/agents';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { OverviewView } from './center/OverviewView';
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
import { CopilotDrawer } from './CopilotDrawer';

const TOP_BAR_HEIGHT = 52;
const SIDEBAR_WIDTH = 260;

type ViewId =
  | 'overview'
  | 'pipeline'
  | 'agents'
  | 'reasoning'
  | 'memory'
  | 'code_interpreter'
  | 'reports';

const VIEWS: { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'layoutDashboard' },
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
  const [copilotOpen, setCopilotOpen] = useState(false);

  const rawView = searchParams.get('view');
  const view: ViewId = (rawView && VIEW_IDS.has(rawView as ViewId) ? (rawView as ViewId) : 'overview');
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

  const { sessionTotal, todayTotal } = useCostTracker(events);

  // Suppress lint warnings for the parts threaded into deeper feature views later.
  void _reasoningTree;
  void user;
  // currentAgent is no longer surfaced in the sidebar (sidebar is pure nav).
  // Keep it computed because center views can subscribe to it later.
  void currentAgent;

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

  const centerContent = useMemo(() => {
    switch (view) {
      case 'overview':
        return <OverviewView events={events} activeSessionId={activeSessionId} />;
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
  }, [view, pipeline, events, activeSessionId]);

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
        onOpenCopilot={() => setCopilotOpen(true)}
        dataMode={dataMode}
      />

      <Sidebar
        width={SIDEBAR_WIDTH}
        topOffset={TOP_BAR_HEIGHT}
        bottomOffset={0}
        view={view}
        onSetView={(v) => setView(v as ViewId)}
        activeSessionId={activeSessionId}
        onSelectSession={setSession}
        onNewSession={newSession}
      />

      {/* Center workspace */}
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          paddingTop: TOP_BAR_HEIGHT + 16,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <div>{centerContent}</div>
      </main>

      <ToastNotification />
      <TourOverlay />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      <SubmitSessionModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onPick={(sid) => startScriptedRun(sid)}
      />
      <CopilotDrawer
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        sessionId={sessionId}
      />
    </div>
  );
}

/** Prefer today's WS-reported total; fall back to the session total. */
function todayCost(todayTotal: number, sessionTotal: number): number {
  if (todayTotal > 0) return todayTotal;
  return sessionTotal;
}
