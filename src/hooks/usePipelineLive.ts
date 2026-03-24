import { useEffect, useContext } from 'react';
import { usePipeline } from './usePipeline';
import { PipelineCtx } from '../context/PipelineContext';

export function usePipelineLive() {
  const pipeline = usePipeline();
  const { run, isLive, startLivePipeline, getStageData, resetRun } = useContext(PipelineCtx);

  // When live stage updates arrive, drive the pipeline animation
  useEffect(() => {
    if (!isLive) return;
    if (run.status !== 'running' && run.status !== 'completed') return;

    const stageEntries = Object.entries(run.stages);
    const runningStage = stageEntries.find(([_, s]) => s.status === 'running');
    const completedIds = stageEntries.filter(([_, s]) => s.status === 'completed').map(([id]) => id);

    if (runningStage) {
      pipeline.setActiveIdDirect(runningStage[0]);
    }
    pipeline.setCompletedDirect(completedIds);

    if (run.status === 'completed') {
      pipeline.setRunningDirect(false);
    }
  }, [run.stages, run.status, isLive, pipeline.setActiveIdDirect, pipeline.setCompletedDirect, pipeline.setRunningDirect]);

  return {
    ...pipeline,
    isLive,
    liveRun: run,
    startLivePipeline,
    getStageData,
    resetRun,
  };
}
