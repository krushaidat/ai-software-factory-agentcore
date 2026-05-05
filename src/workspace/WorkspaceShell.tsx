import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { C } from '../config/colors';
import { type IconName } from '../design/icons';
import { useAuth } from '../hooks/useAuth';
import { usePipelineLive } from '../hooks/usePipelineLive';
import { useAgentStream } from '../hooks/useAgentStream';
import { useWebSocket } from '../hooks/useWebSocket';
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

  // WS hook hoisted up here so any of the callbacks below can use it.
  const { send: wsSend } = useWebSocket(sessionId);

  // Click an existing session row → frozen view of stored sample events.
  // No playback animation, no fake replay on refresh.
  const setSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('session', id);
      params.delete('play');
      params.delete('running');
      setSearchParams(params, { replace: true });
      pipeline.resetRun();
    },
    [searchParams, setSearchParams, pipeline],
  );

  // "+ New session" → create a blank live session and open the submit modal.
  const newSession = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('session', `live-${Date.now()}`);
    params.set('view', 'pipeline');
    params.delete('play');
    params.delete('running');
    setSearchParams(params, { replace: true });
    pipeline.resetRun();
    setSubmitOpen(true);
  }, [searchParams, setSearchParams, pipeline]);

  // After user picks a corpus file from the submit modal: send the file
  // content to the bridge Lambda over WebSocket. NO scripted playback —
  // the workspace shows a "Running on AgentCore" state until real events
  // arrive (3-5 min for a full optB pipeline).
  const runLive = useCallback(
    (filename: string, fileContent: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('running', '1');
      params.set('liveFile', filename);
      params.delete('play');
      setSearchParams(params, { replace: true });

      try {
        wsSend({
          action: 'pipeline_start',
          sessionId,
          payload: {
            fileId: `autoware/${filename}`,
            fileContent,
            mode: 'optB',
          },
        });
      } catch (err) {
        console.warn('[live] pipeline_start dispatch failed:', err);
      }
    },
    [searchParams, setSearchParams, wsSend],
  );

  const {
    events: liveEvents,
    reasoningTree: _reasoningTree,
    currentAgent: liveCurrentAgent,
  } = useAgentStream(sessionId);

  // Resolve the active session descriptor. `null` for blank "+ New session" sessions.
  const sessionDesc = useMemo(() => getSession(activeSessionId), [activeSessionId]);

  // Always render past sessions in 'frozen' mode (instant render of stored
  // events, no time-based animation). The auto-playback that fired on every
  // page refresh is gone — it was confusing because it looked like a live
  // run but was actually a scripted timeline.
  const playback = useEventPlayback({
    sessionId: activeSessionId,
    source: sessionDesc?.playableEvents ?? [],
    frozen: sessionDesc?.frozenEvents ?? [],
    mode: 'frozen',
    speed: 1.0,
  });

  const isRunningLive = searchParams.get('running') === '1';
  const liveFile = searchParams.get('liveFile') ?? undefined;

  // events: live AgentCore events take priority. Otherwise:
  //   - if a live run is in flight (?running=1) and no events yet, show empty
  //     so the "Waiting on AgentCore" UI can render (no fake replay).
  //   - else (browsing a past session) show the frozen sample events.
  const events = useMemo(() => {
    if (liveEvents.length > 0) return liveEvents;
    if (isRunningLive) return []; // honest blank state; never fake events while waiting
    return playback.events;
  }, [liveEvents, isRunningLive, playback.events]);

  // currentAgent: live wins; otherwise playback's computed current agent.
  const currentAgent: AgentName | null = useMemo(() => {
    if (liveEvents.length > 0) return liveCurrentAgent;
    if (isRunningLive) return null;
    return playback.currentAgent;
  }, [liveEvents, isRunningLive, liveCurrentAgent, playback.currentAgent]);

  // Mode label: "Live AgentCore" once real events flow OR while an invocation
  // is in flight (the UI is honestly waiting on AgentCore, not faking).
  const dataMode: 'demo' | 'live' = (liveEvents.length > 0 || isRunningLive) ? 'live' : 'demo';

  // When pipeline_completed arrives, drop the ?running=1 flag so a refresh
  // doesn't re-show the "waiting" state.
  useEffect(() => {
    if (!isRunningLive) return;
    const completed = liveEvents.some((e) => e.type === 'pipeline_completed' || e.type === 'pipeline_failed');
    if (completed) {
      const params = new URLSearchParams(searchParams);
      params.delete('running');
      params.delete('liveFile');
      setSearchParams(params, { replace: true });
    }
  }, [isRunningLive, liveEvents, searchParams, setSearchParams]);

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
        return <PipelineView pipeline={pipeline} isRunningLive={isRunningLive} liveFile={liveFile} />;
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
        onPick={runLive}
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
