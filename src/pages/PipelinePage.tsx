import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMode } from '../hooks/useMode';
import { usePipeline } from '../hooks/usePipeline';
import { getStages } from '../data/stages';
import { PipelineStrip } from '../components/pipeline/PipelineStrip';
import { DiffViewer } from '../components/pipeline/DiffViewer';
import { StagePanel } from '../components/pipeline/StagePanel';
import { PipelineComplete } from '../components/pipeline/PipelineComplete';

interface PipelinePageProps {
  pipeline: ReturnType<typeof usePipeline>;
}

export function PipelinePage({ pipeline }: PipelinePageProps) {
  const { mode } = useMode();
  const { stageId } = useParams<{ stageId?: string }>();
  const navigate = useNavigate();

  const stages = getStages(mode);
  const { activeId, completed, running, startPipeline, jumpToStage } = pipeline;

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

  const isComplete = !running && !activeId && completed.length > 0;

  const handleJump = (id: string) => {
    jumpToStage(id, mode);
    navigate(`/pipeline/${id}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PipelineStrip
        stages={stages}
        activeId={activeId}
        completed={completed}
        running={running}
        onJump={handleJump}
      />

      <DiffViewer />

      <StagePanel stageId={activeId} />

      {isComplete && <PipelineComplete stageCount={stages.length} />}
    </div>
  );
}
