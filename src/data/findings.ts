import type { Finding, RemediationItem, SafetyChainItem, SBOMDep } from '../types';

export function getFindings(mode: string): Finding[] {
  const findings: Finding[] = [
    { sev: 'critical', rule: 'MISRA 11.3', msg: 'Implicit enum cast \u2014 auto-fix available (98%)', fix: 'DiagLog_Write((DiagCode_t)DIAG_CAN_TIMEOUT, elapsed);', auto: true, asil: 'B' },
    { sev: 'warning', rule: 'MISRA 17.7', msg: 'Unchecked RingBuffer_Push return \u2014 guided fix (87%)', fix: 'if (RingBuffer_Push(&diag_buf, &entry) != RB_OK) {\n    DiagFault_Set(DIAG_FAULT_BUF_OVERFLOW);\n}', auto: false, asil: 'B' },
    { sev: 'info', rule: 'Bosch-042', msg: 'Missing DOORS traceability for timeout thresholds', fix: '/* REQ: BR-ECU-CAN-007 */', auto: true, asil: null },
  ];
  if (mode !== 'base') {
    findings.push({
      sev: 'threat', rule: 'ISO 21434-TA',
      msg: 'CAN_TimeoutHandler reachable from external bus \u2014 timeout thresholds are security-relevant parameters',
      fix: null, auto: false, asil: 'B', isThreat: true,
    });
  }
  return findings;
}

export const REMEDIATION_ITEMS: RemediationItem[] = [
  { t: 'MISRA 11.3 \u2014 implicit enum cast', h: 'Matched PR #1203 (ABS). Manual: 3.2 hrs \u2192 AI: < 5 min', ft: 'Auto-fix PR', c: '98%' },
  { t: 'MISRA 17.7 \u2014 unchecked return', h: 'Defect cluster DC-2025-0847 (12 PRs, 6 months)', ft: 'Guided fix', c: '87%' },
];

export const SAFETY_CHAIN: SafetyChainItem[] = [
  { level: 'Safety goal', id: 'SG-BRAKE-01', text: 'Prevent unintended brake degradation', asil: 'B' },
  { level: 'FSR', id: 'FSR-BRAKE-014', text: 'Brake ECU shall detect and respond to CAN bus timeout within defined thresholds', asil: 'B' },
  { level: 'TSR', id: 'TSR-BRAKE-047', text: 'CAN_TimeoutHandler shall implement two-tier timeout (200ms warning, 500ms critical)', asil: 'B' },
  { level: 'Requirement', id: 'BR-ECU-CAN-007', text: 'CAN timeout thresholds per OEM spec v3.2', asil: 'B' },
  { level: 'Implementation', id: 'PR #1847', text: 'CAN_TimeoutHandler + DiagLog_Write + SafeState transition', asil: 'B' },
  { level: 'Verification', id: '89 tests', text: '100% path coverage, 94% branch coverage, all categories pass', asil: 'B' },
];

export const SBOM_DEPS: SBOMDep[] = [
  {
    name: 'SWC_BrakeControl', ver: '3.4.2-rc.47', license: 'Proprietary', vulns: 0,
    children: [
      { name: 'conan/brake_hal', ver: '2.1.0', license: 'Proprietary', vulns: 0 },
      { name: 'conan/diag_lib', ver: '1.8.3', license: 'MIT', vulns: 0 },
      { name: 'conan/can_stack', ver: '4.2.1', license: 'Apache 2.0', vulns: 1 },
      { name: 'conan/rtos_port', ver: '3.0.0', license: 'MIT', vulns: 0 },
      { name: 'conan/safe_math', ver: '1.2.0', license: 'BSD-3', vulns: 0 },
    ],
  },
];

export const TOOL_CONFIDENCE = [
  { tool: 'Bedrock \u2014 Code review agent', tcl: 'TCL2', rationale: 'Generates recommendations (TD2) with potential to violate safety (TD3). Requires validation of all auto-fixes by CI/CD test suite.' },
  { tool: 'Bedrock \u2014 Test selection agent', tcl: 'TCL1', rationale: 'Selects tests (TD1) but does not modify safety-critical code. Low risk of undetected malfunction.' },
  { tool: 'Bedrock \u2014 Requirements agent', tcl: 'TCL2', rationale: 'Generates requirements text that informs safety design. Human review gate required.' },
];
