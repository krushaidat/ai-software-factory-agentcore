import type { TestEnv, ReasoningStep, TestEnvAssignment } from '../types';

export const TEST_ENVIRONMENTS: TestEnv[] = [
  { id: 'VEW-001', type: 'VEW', status: 'available', capabilities: ['CAN bus simulation', 'Brake model', 'Sensor injection'], hwRevision: 'R3.2', fwVersion: 'v3.4.1', queueDepth: 0, asilCapable: 'B' },
  { id: 'VEW-002', type: 'VEW', status: 'available', capabilities: ['CAN bus simulation', 'Brake model'], hwRevision: 'R3.2', fwVersion: 'v3.4.1', queueDepth: 2, asilCapable: 'B' },
  { id: 'HIL-003', type: 'HIL', status: 'available', capabilities: ['CAN bus simulation', 'Brake actuator', 'Sensor injection', 'Power supply cycling'], hwRevision: 'R4.0', fwVersion: 'v3.4.0', queueDepth: 1, asilCapable: 'D' },
  { id: 'HIL-004', type: 'HIL', status: 'maintenance', capabilities: ['CAN bus simulation', 'Brake actuator', 'Sensor injection'], hwRevision: 'R3.8', fwVersion: 'v3.3.2', queueDepth: 0, asilCapable: 'D' },
  { id: 'SIL-010', type: 'SIL', status: 'available', capabilities: ['CAN bus simulation', 'Virtual brake model'], hwRevision: 'N/A', fwVersion: 'v3.4.1', queueDepth: 0, asilCapable: 'A' },
  { id: 'FLEET-T01', type: 'Fleet', status: 'available', capabilities: ['Full vehicle CAN', 'Real brake system', 'GPS + IMU'], hwRevision: 'Production', fwVersion: 'v3.4.0', queueDepth: 3, asilCapable: 'D' },
];

export const REASONING_CHAIN: ReasoningStep[] = [
  { step: 'Analyze PR scope', conclusion: 'PR #1847 modifies CAN_TimeoutHandler in brake ECU \u2014 requires CAN bus simulation + brake model capabilities', icon: '\u{1F50D}' },
  { step: 'Check ASIL requirements', conclusion: 'Component is ASIL-B rated \u2014 requires VEW or HIL (SIL insufficient for ASIL-B brake validation)', icon: '\u26A0\uFE0F' },
  { step: 'Filter by capabilities', conclusion: 'VEW-001, VEW-002, HIL-003 have required CAN + brake capabilities. HIL-004 excluded (maintenance). SIL-010 excluded (ASIL-A only)', icon: '\u{1F527}' },
  { step: 'Check firmware compatibility', conclusion: 'VEW-001 and VEW-002 on v3.4.1 (target baseline). HIL-003 on v3.4.0 \u2014 acceptable for integration test', icon: '\u{1F4CB}' },
  { step: 'Rank by queue depth + fit', conclusion: 'VEW-001 (queue: 0, exact FW match) \u2192 primary. HIL-003 (queue: 1, actuator validation) \u2192 secondary', icon: '\u{1F4CA}' },
];

export const REASONING_CHAIN_OPTB: ReasoningStep = {
  step: 'ASIL-B escalation check',
  conclusion: 'ASIL-B requires HIL actuator validation \u2014 HIL-003 escalated to priority queue for physical brake response verification',
  icon: '\u{1F6E1}',
};

export const TEST_ASSIGNMENTS: TestEnvAssignment[] = [
  { testGroup: 'Unit tests (89)', envId: 'VEW-001', reason: 'Fastest availability, exact FW match' },
  { testGroup: 'Integration tests (12)', envId: 'VEW-001', reason: 'CAN + brake model simulation' },
  { testGroup: 'Actuator validation (4)', envId: 'HIL-003', reason: 'Physical brake actuator required' },
  { testGroup: 'Regression suite (23)', envId: 'VEW-002', reason: 'Parallel execution, load balancing' },
];

export const SKIPPED_ENVS = [
  { id: 'HIL-004', reason: 'Maintenance \u2014 toolchain drift detected' },
  { id: 'SIL-010', reason: 'ASIL-A only \u2014 insufficient for ASIL-B brake component' },
  { id: 'FLEET-T01', reason: 'Deferred to OTA deployment phase \u2014 not needed for pre-merge validation' },
];
