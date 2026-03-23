import type { ModeId } from '../types';

export const QUALITY_ROWS = [
  { label: 'SWE1 \u2014 Requirements', status: 'Full', detail: '3 DOORS reqs traced' },
  { label: 'SWE2 \u2014 Architecture', status: 'Partial', detail: 'EventBus change documented' },
  { label: 'SWE3 \u2014 Detailed design', status: 'Manual', detail: 'Human activity per ASPICE' },
  { label: 'SWE4 \u2014 Unit test', status: 'Full', detail: '89 tests, 3 auto-generated' },
  { label: 'SWE5 \u2014 Integration', status: 'Pending', detail: 'Awaiting BRAKE-4521' },
];

export const FLEET_ROWS = [
  { id: 'VEW-001', status: 'deployed', time: '14:32 UTC' },
  { id: 'VEW-002', status: 'deployed', time: '14:33 UTC' },
  { id: 'HIL-003', status: 'deployed', time: '14:41 UTC' },
  { id: 'HIL-004', status: 'blocked', time: 'Toolchain drift' },
  { id: 'FLEET-T01', status: 'pending', time: 'Awaiting gate' },
];

export const OEM_REPORT_SECTIONS = [
  { title: 'Release summary', content: 'Brake ECU v3.4.2-rc.47 addresses CAN timeout per BMW Spec v3.2. Two-tier threshold (200ms/500ms) with full diagnostic logging.' },
  { title: 'Requirements trace', content: '3/3 requirements from BMW Spec v3.2 \u00A74.7.2 implemented. DOORS: BR-ECU-CAN-007, -008, BR-ECU-SAFE-012.' },
  { title: 'Quality', content: '0 open MISRA findings. 94% branch coverage. DC-2025-0847 root causes addressed.' },
  { title: 'Deployment', content: 'VEW and HIL validated. Fleet pending DTC mapping (ETA 48h).' },
];

export function getJiraUpdates(mode: ModeId) {
  const base = [
    { key: 'BRAKE-1847', action: 'Closed', detail: 'PR merged, all acceptance criteria met' },
    { key: 'BRAKE-4521', action: 'Created', detail: 'Register DIAG_CAN_TIMEOUT in DTC table (blocks fleet)' },
    { key: 'BRAKE-1849', action: 'Updated', detail: 'Linked to PR #1847, DTC code confirmed' },
    { key: 'DC-2025-0847', action: '58% resolved', detail: '7/12 PRs remediated' },
  ];
  if (mode !== 'base') {
    base.push(
      { key: 'BRAKE-4522', action: 'Created', detail: 'CAN bus flood detection (from TARA)' },
      { key: 'BRAKE-4523', action: 'Created', detail: 'Rate-limit timeout counter' },
    );
  }
  return base;
}

export function getGraphUpdates(mode: ModeId) {
  const base = [
    'DiagCode::DIAG_CAN_TIMEOUT \u2192 DTC_MappingTable',
    'CAN_TimeoutHandler \u2192 SafeState::DEGRADED',
    'EVT_BRAKE_DEGRADED \u2192 SWC_VehicleDynamics',
  ];
  if (mode !== 'base') {
    base.push(
      'TARA_THREAT::CAN_FLOOD \u2192 CAN_TimeoutHandler',
      'CS-BRAKE-001 \u2192 RateLimiter requirement',
    );
  }
  return base;
}

export function getMetricsRows(mode: ModeId) {
  const base = [
    { label: 'Code review', before: '2.5 hrs', after: '45 sec', change: '-97%' },
    { label: 'Root cause', before: '3.2 hrs', after: '12 sec', change: '-99%' },
    { label: 'Test selection', before: '47 min', after: '6 min', change: '-87%' },
    { label: 'Fleet config', before: '45 min', after: '4 sec', change: '-99%' },
    { label: 'Cross-SWC', before: '1.5 hrs', after: '8 sec', change: '-99%' },
  ];
  if (mode !== 'base') {
    base.push(
      { label: 'Safety evidence', before: '4 hrs', after: '30 sec', change: '-99%', isNew: true } as any,
      { label: 'Cybersec assessment', before: '3 hrs', after: '15 sec', change: '-99%', isNew: true } as any,
      { label: 'SBOM generation', before: '2 hrs', after: '2.4 sec', change: '-99%', isNew: true } as any,
    );
  }
  return base;
}
