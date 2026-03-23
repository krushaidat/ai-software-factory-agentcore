
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { MODES } from '../../config/modes';
import { getStages } from '../../data/stages';

export function Footer() {
  const { mode } = useMode();
  const modeConfig = MODES.find((m) => m.id === mode);
  const stageCount = getStages(mode).length;

  return (
    <footer
      className="flex items-center justify-between px-6 py-3"
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: 11, color: C.dim }}>
        Storm Reply · AWS Premier Consulting Partner
      </span>
      <span style={{ fontSize: 11, color: C.dim }}>
        Mode: {modeConfig?.label ?? mode} · {stageCount} stages
      </span>
    </footer>
  );
}
