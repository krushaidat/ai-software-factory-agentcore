import type { PromotionStage, GateCriterion } from '../types';

export const PROMOTION_PATH: PromotionStage[] = [
  { name: 'Dev', status: 'passed' },
  { name: 'Integration', status: 'current' },
  { name: 'Staging', status: 'blocked' },
  { name: 'Pre-Production', status: 'future' },
  { name: 'Production', status: 'future' },
];

export function getGateCriteria(mode: string): GateCriterion[] {
  const base: GateCriterion[] = [
    { source: 'CI/CD Build', criterion: 'All build steps pass', verdict: 'pass', confidence: '100%', detail: 'arm-gcc 12.3 build clean, 247 unit tests pass' },
    { source: 'Code Review', criterion: 'MISRA findings resolved', verdict: 'pass', confidence: '98%', detail: 'MISRA 11.3 auto-fixed, 17.7 guided fix applied' },
    { source: 'Test Selection', criterion: 'Coverage targets met', verdict: 'pass', confidence: '95%', detail: '89 tests selected, 3 auto-generated for coverage gaps' },
    { source: 'Test Env', criterion: 'VEW validation complete', verdict: 'pass', confidence: '100%', detail: 'VEW-001 smoke test passed, CAN timeout validated' },
    { source: 'Fleet Config', criterion: 'ECU compatibility verified', verdict: 'warn', confidence: '83%', detail: '15/18 ECU nodes compliant, 3 drift detected' },
    { source: 'Integration', criterion: 'Cross-SWC check', verdict: 'pass', confidence: '100%', detail: 'SWC_VehicleDynamics compatible, DTC mapping created' },
    { source: 'HIL Validation', criterion: 'Actuator response test', verdict: 'pending', confidence: '\u2014', detail: 'HIL-003 actuator validation in queue (ETA: 2h)' },
    { source: 'DTC Mapping', criterion: 'BRAKE-4521 registered', verdict: 'block', confidence: '\u2014', detail: 'DTC code not yet registered in OEM diagnostic database' },
  ];

  if (mode !== 'base') {
    base.push(
      { source: 'Safety Gate', criterion: 'ISO 26262 evidence chain', verdict: 'pass', confidence: '100%', detail: 'ASIL-B chain complete, all coverage targets met' },
      { source: 'Cybersecurity Gate', criterion: 'ISO 21434 assessment', verdict: 'warn', confidence: '87%', detail: 'CAN bus flood detection recommended (BRAKE-4522)' },
      { source: 'SBOM Compliance', criterion: 'Supply chain policy', verdict: 'pass', confidence: '100%', detail: '0 critical CVEs, all licenses approved' },
    );
  }

  return base;
}

export const PROMOTION_RECOMMENDATION = {
  approved: 'Integration',
  blocked: 'Staging',
  blockers: [
    'HIL-003 actuator validation pending (ETA: 2h)',
    'BRAKE-4521 DTC mapping not registered in OEM database',
  ],
};

export const ASIL_APPROVAL = {
  required: true,
  level: 'ASIL-B',
  rule: 'ASIL-B and above requires human sign-off for Staging promotion even when all automated gates pass',
  approver: 'Dr. S. Keller \u2014 Functional Safety Lead',
  status: 'pending' as const,
  signatureRef: 'FSA-2025-1847-PENDING',
};
