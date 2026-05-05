import { PipelinePage } from '../../pages/PipelinePage';
import { usePipelineLive } from '../../hooks/usePipelineLive';

interface PipelineViewProps {
  pipeline: ReturnType<typeof usePipelineLive>;
  isRunningLive: boolean;
  liveFile?: string;
}

/** Wraps PipelinePage for use inside the workspace tab system. */
export function PipelineView({ pipeline, isRunningLive, liveFile }: PipelineViewProps) {
  return <PipelinePage pipeline={pipeline} isRunningLive={isRunningLive} liveFile={liveFile} />;
}
