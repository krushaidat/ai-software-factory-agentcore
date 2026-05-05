import { useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMode } from '../hooks/useMode';
import { usePipelineLive } from '../hooks/usePipelineLive';
import { getStages } from '../data/stages';
import { RunMetadata } from '../components/pipeline/RunMetadata';
import { PipelineStrip } from '../components/pipeline/PipelineStrip';
import { DiffViewer } from '../components/pipeline/DiffViewer';
import { StagePanel } from '../components/pipeline/StagePanel';
import { PipelineComplete } from '../components/pipeline/PipelineComplete';
import { useToast } from '../hooks/useToast';
import { PipelineCtx } from '../context/PipelineContext';

interface PipelinePageProps {
  pipeline: ReturnType<typeof usePipelineLive>;
  /** True while a live AgentCore run is in flight (waiting on the supervisor). */
  isRunningLive?: boolean;
  /** File picked for the live run (for the banner). */
  liveFile?: string;
}

/** Map stage IDs to toast messages fired on completion */
const STAGE_TOASTS: Record<string, { type: 'success' | 'warning' | 'info'; message: string }> = {
  review: { type: 'warning', message: '\uD83D\uDD0D AI found 3 MISRA violations' },
  remediation: { type: 'success', message: '\uD83D\uDEE0 2 auto-fixes applied (98% confidence)' },
  testselect: { type: 'info', message: '\uD83E\uDDEA 89 tests selected, 3 auto-generated' },
};

export function PipelinePage({ pipeline, isRunningLive = false, liveFile }: PipelinePageProps) {
  const { mode } = useMode();
  const { stageId } = useParams<{ stageId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { getStageData } = useContext(PipelineCtx);

  const stages = getStages(mode);
  const { activeId, completed, running, stageTimings, jumpToStage } = pipeline;

  // Deep-link: if stageId in URL, jump to that stage
  useEffect(() => {
    if (stageId && stageId !== activeId) {
      jumpToStage(stageId, mode);
    }
  }, [stageId]);

  // NOTE: removed the auto-start that fired the legacy timer-driven pipeline
  // simulation on every page refresh. That was the "dumb pipeline simulates
  // again" bug — it was a setTimeout-based fake. The pipeline now reflects
  // either: (a) frozen sample events of a clicked-on past session, or
  // (b) live events streamed back from AgentCore Runtime via the bridge.

  // Fire toasts when stages complete
  useEffect(() => {
    if (completed.length === 0) return;
    const lastCompleted = completed[completed.length - 1];
    const toast = STAGE_TOASTS[lastCompleted];
    if (toast) {
      addToast(toast);
    }
    // Pipeline complete toast
    if (!running && !activeId && completed.length === stages.length) {
      addToast({ type: 'success', message: `\u2705 Pipeline complete \u2014 all ${stages.length} stages passed` });
    }
  }, [completed.length, running]);

  const isComplete = !running && !activeId && completed.length > 0;

  const handleJump = (id: string) => {
    jumpToStage(id, mode);
    navigate(`/pipeline/${id}`, { replace: true });
  };

  const stageData = activeId ? getStageData(activeId) : null;

  return (
    <div className="space-y-6">
      {isRunningLive && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(140,87,255,0.18), rgba(86,202,0,0.15))',
            border: '1px solid rgba(140,87,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '3px solid rgba(140,87,255,0.3)',
              borderTopColor: '#8c57ff',
              animation: 'aisf-spin 0.9s linear infinite',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e7e3fc' }}>
              Running on AgentCore
            </div>
            <div style={{ fontSize: 12, color: '#a59ec9', marginTop: 2 }}>
              Supervisor + 6 specialist agents are analyzing
              {liveFile ? <> <code style={{ color: '#8c57ff', background: 'rgba(140,87,255,0.12)', padding: '1px 6px', borderRadius: 4 }}>{liveFile}</code></> : ' your file'} —
              real Bedrock Sonnet 4.5 calls. Full optB pipeline takes ~3-5 min.
            </div>
          </div>
          <style>{`@keyframes aisf-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <RunMetadata running={running} completed={isComplete} />

      <PipelineStrip
        stages={stages}
        activeId={activeId}
        completed={completed}
        running={running}
        onJump={handleJump}
        stageTimings={stageTimings}
      />

      <DiffViewer />

      <StagePanel stageId={activeId} data={stageData} />

      {isComplete && <PipelineComplete stageCount={stages.length} />}
    </div>
  );
}
