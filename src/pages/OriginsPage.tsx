import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../hooks/useMode';
import { usePipeline } from '../hooks/usePipeline';
import { getOrigins } from '../data/origins';
import { getStages } from '../data/stages';
import { OriginGrid } from '../components/origins/OriginGrid';
import { OriginPanel } from '../components/origins/OriginPanel';
import { PRCard } from '../components/origins/PRCard';

interface OriginsPageProps {
  pipeline: ReturnType<typeof usePipeline>;
}

export function OriginsPage({ pipeline }: OriginsPageProps) {
  const { mode } = useMode();
  const navigate = useNavigate();
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

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

      <PRCard onSubmit={handleSubmit} stageCount={stages.length} />
    </div>
  );
}
