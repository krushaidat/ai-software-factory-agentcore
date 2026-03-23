
import { ReqOrigin } from './ReqOrigin';
import { DefectOrigin } from './DefectOrigin';
import { PLMOrigin } from './PLMOrigin';
import { TARAOrigin } from './TARAOrigin';
import { AnimateIn } from '../../components/shared';

interface OriginPanelProps {
  selectedOrigin: string | null;
}

const PANELS: Record<string, React.FC> = {
  requirements: ReqOrigin,
  defect: DefectOrigin,
  plm: PLMOrigin,
  tara: TARAOrigin,
};

export function OriginPanel({ selectedOrigin }: OriginPanelProps) {
  if (!selectedOrigin) return null;
  const Panel = PANELS[selectedOrigin];
  if (!Panel) return null;

  return (
    <AnimateIn>
      <Panel />
    </AnimateIn>
  );
}
