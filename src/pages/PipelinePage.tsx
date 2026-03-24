import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMode } from '../hooks/useMode';
import { usePipeline } from '../hooks/usePipeline';
import { getStages } from '../data/stages';
import { RunMetadata } from '../components/pipeline/RunMetadata';
import { PipelineStrip } from '../components/pipeline/PipelineStrip';
import { DiffViewer } from '../components/pipeline/DiffViewer';
import { StagePanel } from '../components/pipeline/StagePanel';
import { PipelineComplete } from '../components/pipeline/PipelineComplete';
import { useToast } from '../hooks/useToast';

interface PipelinePageProps {
  pipeline: ReturnType<typeof usePipeline>;
}

/** Map stage IDs to toast messages fired on completion */
const STAGE_TOASTS: Record<string, { type: 'success' | 'warning' | 'info'; message: string }> = {
  review: { type: 'warning', message: '\uD83D\uDD0D AI found 3 MISRA violations' },
  remediation: { type: 'success', message: '\uD83D\uDEE0 2 auto-fixes applied (98% confidence)' },
  testselect: { type: 'info', message: '\uD83E\uDDEA 89 tests selected, 3 auto-generated' },
};

export function PipelinePage({ pipeline }: PipelinePageProps) {
  const { mode } = useMode();
  const { stageId } = useParams<{ stageId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const stages = getStages(mode);
  const { activeId, completed, running, stageTimings, startPipeline, jumpToStage } = pipeline;

  // Deep-link: if stageId in URL, jump to that stage
  useEffect(() => {
    if (stageId && stageId !== activeId) {
      jumpToStage(stageId, mode);
    }
  }, [stageId]);

  // Auto-start pipeline if nothing is active and no stage param
  useEffect(() => {
    if (!stageId && !activeId && !running && completed.length === 0) {
      startPipeline(mode);
    }
  }, []);

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

  return (
    <div className="space-y-6">
      <RunMetadata
        running={running}
        completed={isComplete}
      />

      <PipelineStrip
        stages={stages}
        activeId={activeId}
        completed={completed}
        running={running}
        onJump={handleJump}
        stageTimings={stageTimings}
      />

      <DiffViewer />

      <StagePanel stageId={activeId} />

      {isComplete && <PipelineComplete stageCount={stages.length} />}
    </div>
  );
}
