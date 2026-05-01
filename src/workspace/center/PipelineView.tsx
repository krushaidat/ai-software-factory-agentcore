import { PipelinePage } from '../../pages/PipelinePage';
import { usePipelineLive } from '../../hooks/usePipelineLive';

interface PipelineViewProps {
  pipeline: ReturnType<typeof usePipelineLive>;
}

/** Wraps PipelinePage for use inside the workspace tab system. */
export function PipelineView({ pipeline }: PipelineViewProps) {
  return <PipelinePage pipeline={pipeline} />;
}
