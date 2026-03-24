
import { CICDPanel } from './CICDPanel';
import { ReviewPanel } from './ReviewPanel';
import { RemediationPanel } from './RemediationPanel';
import { TestSelectPanel } from './TestSelectPanel';
import { TestEnvPanel } from './TestEnvPanel';
import { FleetConfigPanel } from './FleetConfigPanel';
import { IntegrationPanel } from './IntegrationPanel';
import { DeployPanel } from './DeployPanel';
import { CybersecPanel } from './CybersecPanel';
import { SafetyPanel } from './SafetyPanel';
import { SBOMPanel } from './SBOMPanel';
import { PromotionGatePanel } from './PromotionGatePanel';
import { AnimateIn } from '../../components/shared';

const PANELS: Record<string, React.FC<{ data?: any }>> = {
  cicd: CICDPanel,
  sbom: SBOMPanel,
  review: ReviewPanel,
  remediation: RemediationPanel,
  cybersec: CybersecPanel,
  testselect: TestSelectPanel,
  safety: SafetyPanel,
  testenv: TestEnvPanel,
  fleetconfig: FleetConfigPanel,
  integration: IntegrationPanel,
  deploy: DeployPanel,
  promotion: PromotionGatePanel,
};

interface StagePanelProps {
  stageId: string | null;
  data?: any;
}

export function StagePanel({ stageId, data }: StagePanelProps) {
  if (!stageId) return null;
  const Panel = PANELS[stageId];
  if (!Panel) return null;

  return (
    <AnimateIn key={stageId}>
      <Panel data={data} />
    </AnimateIn>
  );
}
