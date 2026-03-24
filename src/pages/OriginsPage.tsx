import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../hooks/useMode';
import { usePipelineLive } from '../hooks/usePipelineLive';
import { getOrigins } from '../data/origins';
import { getStages } from '../data/stages';
import { OriginGrid } from '../components/origins/OriginGrid';
import { OriginPanel } from '../components/origins/OriginPanel';
import { PRCard } from '../components/origins/PRCard';
import { CodeInput } from '../components/pipeline/CodeInput';
import { PipelineCtx } from '../context/PipelineContext';

interface OriginsPageProps {
  pipeline: ReturnType<typeof usePipelineLive>;
}

export function OriginsPage({ pipeline }: OriginsPageProps) {
  const { mode } = useMode();
  const navigate = useNavigate();
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const { isLive, startLivePipeline, run: liveRun } = useContext(PipelineCtx);

  const origins = getOrigins(mode);
  const stages = getStages(mode);

  const handleSubmit = () => {
    pipeline.startPipeline(mode);
    navigate('/pipeline');
  };

  return (
    <div className="space-y-6">
      <OriginGrid
        origins={origins}
        selectedOrigin={selectedOrigin}
        onSelect={(id) => setSelectedOrigin(id === selectedOrigin ? null : id)}
      />

      {selectedOrigin && (
        <OriginPanel selectedOrigin={selectedOrigin} />
      )}

      {isLive ? (
        <CodeInput
          onSubmit={(code) => {
            startLivePipeline(code, mode);
            navigate('/pipeline');
          }}
          stageCount={stages.length}
          isRunning={liveRun?.status === 'running'}
        />
      ) : (
        <PRCard onSubmit={handleSubmit} stageCount={stages.length} />
      )}
    </div>
  );
}
