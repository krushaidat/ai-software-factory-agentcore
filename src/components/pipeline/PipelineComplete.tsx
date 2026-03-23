
import { C } from '../../config/colors';
import { AnimateIn } from '../../components/shared';
import { useNavigate } from 'react-router-dom';

interface PipelineCompleteProps {
  stageCount: number;
}

export function PipelineComplete({ stageCount }: PipelineCompleteProps) {
  const navigate = useNavigate();

  return (
    <AnimateIn>
      <div
        style={{
          padding: '24px 20px',
          background: C.okDim,
          border: `1px solid rgba(16,185,129,0.3)`,
          borderRadius: 10,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
        <div style={{ color: C.ok, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Pipeline Complete
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          All {stageCount} stages passed successfully
        </div>
        <button
          onClick={() => navigate('/reports')}
          style={{
            padding: '8px 24px',
            background: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 6,
            color: C.accent,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          View reports
        </button>
      </div>
    </AnimateIn>
  );
}
