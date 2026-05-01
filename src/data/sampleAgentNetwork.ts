/**
 * Demo trace for the Agent Network visualization in offline mode.
 *
 * When `ENV.isLive` is false AND no real `a2a_message` events have been
 * observed, the visualization replays this scripted trace on a 10s loop so
 * prospects always see motion. Each entry fires `delayMs` after the previous
 * one (relative to start of cycle).
 */

import type { A2AMessage } from '../types/agents';

export interface DemoA2AStep {
  /** Milliseconds since the start of the loop. */
  delayMs: number;
  msg: A2AMessage;
}

export const DEMO_A2A_TRACE: DemoA2AStep[] = [
  {
    delayMs: 600,
    msg: {
      from: 'supervisor',
      to: 'quality_agent',
      message: 'Run static analysis on CAN_TimeoutHandler',
      purpose: 'request_data',
    },
  },
  {
    delayMs: 1800,
    msg: {
      from: 'supervisor',
      to: 'safety_agent',
      message: 'Check ASIL-D evidence chain for SG-BRAKE-01',
      purpose: 'asil_evidence',
    },
  },
  {
    delayMs: 2900,
    msg: {
      from: 'quality_agent',
      to: 'safety_agent',
      message: 'Cyclomatic complexity = 14 in CAN_TimeoutHandler',
      purpose: 'cross_check',
    },
  },
  {
    delayMs: 3700,
    msg: {
      from: 'supervisor',
      to: 'security_agent',
      message: 'Scan dependencies for CVEs',
      purpose: 'request_data',
    },
  },
  {
    delayMs: 4900,
    msg: {
      from: 'security_agent',
      to: 'safety_agent',
      message: 'CVE-2024-2871 affects libcan, fail-safe path needs review',
      purpose: 'cross_check',
    },
  },
  {
    delayMs: 6100,
    msg: {
      from: 'safety_agent',
      to: 'test_agent',
      message: 'Need HIL coverage for DEGRADED state transition',
      purpose: 'request_data',
    },
  },
  {
    delayMs: 7300,
    msg: {
      from: 'test_agent',
      to: 'deployment_agent',
      message: 'All gates passed — promote to staging',
      purpose: 'request_data',
    },
  },
  {
    delayMs: 8500,
    msg: {
      from: 'deployment_agent',
      to: 'integration_agent',
      message: 'Update PR #1847 with deployment manifest',
      purpose: 'request_data',
    },
  },
];

export const DEMO_LOOP_MS = 10_000;
