import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { QualityTab } from './QualityTab';
import { FleetTab } from './FleetTab';
import { OEMReportTab } from './OEMReportTab';
import { JiraTab } from './JiraTab';
import { KnowledgeGraphTab } from './KnowledgeGraphTab';
import { CIMetricsTab } from './CIMetricsTab';
import { SafetyEvidenceTab } from './SafetyEvidenceTab';
import { CyberEvidenceTab } from './CyberEvidenceTab';
import { SBOMTab } from './SBOMTab';
import { ROICalculator } from '../roi/ROICalculator';

interface TabDef {
  id: string;
  label: string;
  requiresNonBase?: boolean;
}

const ALL_TABS: TabDef[] = [
  { id: 'quality', label: 'ASPICE / MISRA' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'oem', label: 'OEM Report' },
  { id: 'jira', label: 'Jira' },
  { id: 'graph', label: 'Knowledge Graph' },
  { id: 'metrics', label: 'CI Metrics' },
  { id: 'safety26262', label: 'Safety (26262)', requiresNonBase: true },
  { id: 'cyber21434', label: 'Cyber (21434)', requiresNonBase: true },
  { id: 'sbom', label: 'SBOM', requiresNonBase: true },
  { id: 'roi', label: 'ROI Calculator' },
];

const tabComponents: Record<string, FC> = {
  quality: QualityTab,
  fleet: FleetTab,
  oem: OEMReportTab,
  jira: JiraTab,
  graph: KnowledgeGraphTab,
  metrics: CIMetricsTab,
  safety26262: SafetyEvidenceTab,
  cyber21434: CyberEvidenceTab,
  sbom: SBOMTab,
  roi: ROICalculator,
};

export function OutputsView() {
  const { mode } = useMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get('tab') || 'quality';

  const visibleTabs = ALL_TABS.filter(
    (t) => !t.requiresNonBase || mode !== 'base',
  );

  const activeTab = visibleTabs.find((t) => t.id === tabId) ? tabId : 'quality';
  const ActiveComponent = tabComponents[activeTab];

  function selectTab(id: string) {
    setSearchParams({ tab: id });
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div
        data-tour="outputs-tabs"
        className="flex gap-1 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: isActive
                  ? `1px solid ${C.accentBorder}`
                  : `1px solid transparent`,
                background: isActive ? C.accentDim : 'transparent',
                color: isActive ? C.accent : C.muted,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
