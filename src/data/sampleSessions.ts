/**
 * Per-session scripted demo data.
 *
 * Three distinct sessions, each with its own:
 *   - File ID + display label
 *   - Code snippet (preview)
 *   - Event timeline (subset of CONTRACTS event types) with relative offsets
 *   - Memory entries / findings that match the file
 *
 * The shell selects one based on the active session id. Events use relative
 * `offsetMs` from session start; the playback hook turns them into absolute
 * timestamps by anchoring offset 0 to the moment the user "started" the session.
 */

import type { AgentEvent, AgentName } from '../types/agents';

export interface SessionDescriptor {
  id: string;
  label: string;
  meta: string;
  fileId: string;
  fileSummary: string;
  /** "Done" preset — events with absolute (frozen) timestamps for instant display. */
  frozenEvents: AgentEvent[];
  /** "Playable" preset — events with offsetMs from session start, used during playback. */
  playableEvents: PlayableEvent[];
  /** Headline numbers (Vuexy hero card) computed for this session. */
  headline: SessionHeadline;
}

export interface PlayableEvent {
  /** Milliseconds since playback started. */
  offsetMs: number;
  agentName: AgentName;
  type: AgentEvent['type'];
  spanId: string;
  parentSpanId: string | null;
  payload: Record<string, unknown>;
}

export interface SessionHeadline {
  passRate: number;       // 0-100
  findingsAutoFixed: number;
  avgRunTimeSec: number;
  asilCoverage: number;   // 0-100
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFrozen(playable: PlayableEvent[], baseIso: string, sessionId: string, runId: string): AgentEvent[] {
  const baseMs = new Date(baseIso).getTime();
  return playable.map((p) => ({
    type: p.type,
    timestamp: new Date(baseMs + p.offsetMs).toISOString(),
    sessionId,
    runId,
    agentName: p.agentName,
    spanId: p.spanId,
    parentSpanId: p.parentSpanId,
    payload: p.payload,
  } as AgentEvent));
}

// ---------------------------------------------------------------------------
// Session 1 — PR #1847 — Brake ECU CAN timeout handler  (the original)
// ---------------------------------------------------------------------------

const PR_1847_PLAYABLE: PlayableEvent[] = [
  { offsetMs: 0, agentName: 'supervisor', type: 'pipeline_started', spanId: 'p', parentSpanId: null,
    payload: { fileId: 'brake-ecu/can_timeout_handler.c', mode: 'optB' } },
  { offsetMs: 60, agentName: 'supervisor', type: 'agent_invoked', spanId: 's', parentSpanId: 'p',
    payload: { task: 'Analyzing brake ECU CAN timeout handler PR' } },
  { offsetMs: 200, agentName: 'supervisor', type: 'memory_read', spanId: 's-m1', parentSpanId: 's',
    payload: { strategy: 'SEMANTIC', query: 'CAN timeout patterns brake ECU',
      matches: [
        { text: 'DC-2025-0847 — 50ms bus-error timeout caused HARA escalation', score: 0.92 },
        { text: 'DC-2024-1102 — Watchdog reset preferred over silent retry', score: 0.87 },
      ], duration_ms: 45 } },
  { offsetMs: 320, agentName: 'supervisor', type: 'agent_thinking', spanId: 's-t1', parentSpanId: 's',
    payload: { delta: 'Routing to Quality and Safety in parallel; Security for CVE diff.', done: true } },

  { offsetMs: 500, agentName: 'quality_agent', type: 'agent_invoked', spanId: 'q', parentSpanId: 's',
    payload: { task: 'MISRA + complexity scan' } },
  { offsetMs: 700, agentName: 'quality_agent', type: 'tool_call', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_name: 'misra_checker', via: 'agentcore_gateway', tool_call_id: 'q-t1',
      params: { file: 'can_timeout_handler.c', ruleset: 'MISRA-C:2012' } } },
  { offsetMs: 2200, agentName: 'quality_agent', type: 'tool_result', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_call_id: 'q-t1', duration_ms: 1480,
      result: { findings: [
        { rule: 'MISRA-11.3', severity: 'critical', line: 47, msg: 'Cast between unrelated pointer types' },
        { rule: 'MISRA-17.7', severity: 'warning', line: 92, msg: 'Return value of non-void function not used' },
        { rule: 'MISRA-15.5', severity: 'advisory', line: 134, msg: 'Multiple return paths' },
      ] } } },
  { offsetMs: 2600, agentName: 'quality_agent', type: 'code_execution', spanId: 'q-c1', parentSpanId: 'q',
    payload: { language: 'python', duration_ms: 220, stderr: null,
      code: 'import re\ncode = open("/var/code/can_timeout_handler.c").read()\npattern = r"\\(([\\w_]+)\\s*\\*\\)"\nprint("hits:", len(re.findall(pattern, code)))',
      stdout: 'hits: 3' } },
  { offsetMs: 3100, agentName: 'quality_agent', type: 'agent_completed', spanId: 'q', parentSpanId: 's',
    payload: { duration_ms: 2600, tokens_in: 4200, tokens_out: 1100,
      result: { critical: 1, warning: 1, advisory: 1, complexity: 14 } } },

  { offsetMs: 600, agentName: 'safety_agent', type: 'agent_invoked', spanId: 'sa', parentSpanId: 's',
    payload: { task: 'ISO 26262 ASIL-B evidence chain' } },
  { offsetMs: 1100, agentName: 'safety_agent', type: 'a2a_message', spanId: 'sa-a1', parentSpanId: 'sa',
    payload: { from: 'safety_agent', to: 'quality_agent', purpose: 'asil_evidence',
      message: 'Need cyclomatic complexity for ASIL-B evidence' } },
  { offsetMs: 1900, agentName: 'safety_agent', type: 'tool_call', spanId: 'sa-t1', parentSpanId: 'sa',
    payload: { tool_name: 'requirement_lookup', via: 'agentcore_gateway', tool_call_id: 'sa-t1',
      params: { req_id: 'BR-ECU-CAN-007' } } },
  { offsetMs: 2700, agentName: 'safety_agent', type: 'tool_result', spanId: 'sa-t1', parentSpanId: 'sa',
    payload: { tool_call_id: 'sa-t1', duration_ms: 780,
      result: { id: 'BR-ECU-CAN-007', asil: 'B', satisfied: true } } },
  { offsetMs: 3600, agentName: 'safety_agent', type: 'agent_completed', spanId: 'sa', parentSpanId: 's',
    payload: { duration_ms: 3000, tokens_in: 3800, tokens_out: 950,
      result: { asil_level: 'B', evidence_complete: true, gaps: 0 } } },

  { offsetMs: 800, agentName: 'security_agent', type: 'agent_invoked', spanId: 'se', parentSpanId: 's',
    payload: { task: 'CVE diff + threat model on CAN bus surface' } },
  { offsetMs: 1500, agentName: 'security_agent', type: 'browser_action', spanId: 'se-b1', parentSpanId: 'se',
    payload: { action: 'navigate', url: 'https://nvd.nist.gov/vuln/search?keywords=can+bus+timeout',
      result_summary: 'Found 0 unmitigated CVEs in scope; 1 informational' } },
  { offsetMs: 3300, agentName: 'security_agent', type: 'agent_completed', spanId: 'se', parentSpanId: 's',
    payload: { duration_ms: 2500, tokens_in: 2900, tokens_out: 720,
      result: { cves_found: 0, threat_score: 'LOW' } } },

  { offsetMs: 4000, agentName: 'test_agent', type: 'agent_invoked', spanId: 't', parentSpanId: 's',
    payload: { task: 'Select tests + allocate HIL/VEW' } },
  { offsetMs: 4400, agentName: 'test_agent', type: 'tool_call', spanId: 't-t1', parentSpanId: 't',
    payload: { tool_name: 'fleet_query', via: 'agentcore_gateway', tool_call_id: 't-t1',
      params: { type: 'HIL', asil_capable: 'B', available: true } } },
  { offsetMs: 4900, agentName: 'test_agent', type: 'tool_result', spanId: 't-t1', parentSpanId: 't',
    payload: { tool_call_id: 't-t1', duration_ms: 480,
      result: { selected: 89, environments: ['VEW-001', 'HIL-003'], skipped: 1758 } } },
  { offsetMs: 5500, agentName: 'test_agent', type: 'agent_completed', spanId: 't', parentSpanId: 's',
    payload: { duration_ms: 1500, tokens_in: 2400, tokens_out: 680,
      result: { tests_selected: 89, environments: 2, coverage_estimate: 94 } } },

  { offsetMs: 6000, agentName: 'integration_agent', type: 'agent_invoked', spanId: 'i', parentSpanId: 's',
    payload: { task: 'SBOM + AUTOSAR cross-SWC' } },
  { offsetMs: 7100, agentName: 'integration_agent', type: 'agent_completed', spanId: 'i', parentSpanId: 's',
    payload: { duration_ms: 1100, tokens_in: 1800, tokens_out: 540,
      result: { sbom_compliant: true, license_status: 'all_clear' } } },

  { offsetMs: 7400, agentName: 'deployment_agent', type: 'agent_invoked', spanId: 'd', parentSpanId: 's',
    payload: { task: 'Promotion gate decision' } },
  { offsetMs: 8400, agentName: 'deployment_agent', type: 'memory_write', spanId: 'd-m1', parentSpanId: 'd',
    payload: { strategy: 'SUMMARY',
      content: 'PR #1847: 1 critical MISRA auto-fixed, ASIL-B evidence complete, promoted to staging',
      namespace: 'pr/1847' } },
  { offsetMs: 8700, agentName: 'deployment_agent', type: 'agent_completed', spanId: 'd', parentSpanId: 's',
    payload: { duration_ms: 1300, tokens_in: 2100, tokens_out: 620,
      result: { promotion_verdict: 'APPROVE', target_stage: 'staging' } } },

  { offsetMs: 9000, agentName: 'supervisor', type: 'agent_completed', spanId: 's', parentSpanId: 'p',
    payload: { duration_ms: 8940, tokens_in: 18000, tokens_out: 4200,
      result: { verdict: 'APPROVE', findings_total: 3, auto_fixed: 1 } } },
  { offsetMs: 9100, agentName: 'supervisor', type: 'pipeline_completed', spanId: 'p', parentSpanId: null,
    payload: { duration_ms: 9100, totalTokens: 22200, totalCost: 0.18,
      agentsInvoked: ['quality_agent', 'safety_agent', 'security_agent', 'test_agent', 'integration_agent', 'deployment_agent'] } },
];

const PR_1847: SessionDescriptor = {
  id: 'pr-1847',
  label: 'PR #1847 — Brake ECU CAN timeout',
  meta: '2 min ago',
  fileId: 'autoware/control/autonomous_emergency_braking.cpp',
  fileSummary: '46 KB · ASIL-D · 1,134 LOC',
  playableEvents: PR_1847_PLAYABLE,
  frozenEvents: buildFrozen(PR_1847_PLAYABLE, '2026-04-30T14:32:01.000Z', 'pr-1847', 'RUN-1847-047'),
  headline: { passRate: 94, findingsAutoFixed: 1, avgRunTimeSec: 9, asilCoverage: 100 },
};

// ---------------------------------------------------------------------------
// Session 2 — PR #1845 — IMU corrector calibration
// ---------------------------------------------------------------------------

const PR_1845_PLAYABLE: PlayableEvent[] = [
  { offsetMs: 0, agentName: 'supervisor', type: 'pipeline_started', spanId: 'p', parentSpanId: null,
    payload: { fileId: 'autoware/sensing/imu_corrector.cpp', mode: 'optB' } },
  { offsetMs: 80, agentName: 'supervisor', type: 'agent_invoked', spanId: 's', parentSpanId: 'p',
    payload: { task: 'Analyzing IMU corrector calibration update' } },
  { offsetMs: 250, agentName: 'supervisor', type: 'memory_read', spanId: 's-m1', parentSpanId: 's',
    payload: { strategy: 'SEMANTIC', query: 'IMU bias drift calibration patterns',
      matches: [
        { text: 'DC-2024-0712 — Allan variance threshold needs ASIL-B justification', score: 0.89 },
        { text: 'DC-2024-0431 — Static yaw offset on Kalman filter bias state', score: 0.84 },
      ], duration_ms: 38 } },
  { offsetMs: 380, agentName: 'supervisor', type: 'agent_thinking', spanId: 's-t1', parentSpanId: 's',
    payload: { delta: 'Sensor fusion change. Quality + Safety priority; Security low risk for IMU stack.', done: true } },

  { offsetMs: 500, agentName: 'quality_agent', type: 'agent_invoked', spanId: 'q', parentSpanId: 's',
    payload: { task: 'Floating point + numerical stability scan' } },
  { offsetMs: 700, agentName: 'quality_agent', type: 'tool_call', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_name: 'misra_checker', via: 'agentcore_gateway', tool_call_id: 'q-t1',
      params: { file: 'imu_corrector.cpp', ruleset: 'MISRA-C++:2008+AUTOSAR' } } },
  { offsetMs: 1900, agentName: 'quality_agent', type: 'tool_result', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_call_id: 'q-t1', duration_ms: 1180,
      result: { findings: [
        { rule: 'AUTOSAR-A0-4-2', severity: 'warning', line: 88, msg: 'Implicit conversion from float to double' },
        { rule: 'MISRA-10.3', severity: 'advisory', line: 153, msg: 'Composite expression assigned to wider type' },
      ] } } },
  { offsetMs: 2400, agentName: 'quality_agent', type: 'code_execution', spanId: 'q-c1', parentSpanId: 'q',
    payload: { language: 'python', duration_ms: 280, stderr: null,
      code: '# numerical stability sanity check\nimport math\neps = 1e-9\nx = 0.1 + 0.2\nprint(abs(x - 0.3) < eps)',
      stdout: 'False  # warning: classic float aggregation' } },
  { offsetMs: 2900, agentName: 'quality_agent', type: 'agent_completed', spanId: 'q', parentSpanId: 's',
    payload: { duration_ms: 2400, tokens_in: 3600, tokens_out: 920,
      result: { critical: 0, warning: 1, advisory: 1, complexity: 7 } } },

  { offsetMs: 700, agentName: 'safety_agent', type: 'agent_invoked', spanId: 'sa', parentSpanId: 's',
    payload: { task: 'ASIL-B classification for IMU corrector' } },
  { offsetMs: 1300, agentName: 'safety_agent', type: 'tool_call', spanId: 'sa-t1', parentSpanId: 'sa',
    payload: { tool_name: 'requirement_lookup', via: 'agentcore_gateway', tool_call_id: 'sa-t1',
      params: { req_id: 'SR-LOC-014' } } },
  { offsetMs: 2300, agentName: 'safety_agent', type: 'tool_result', spanId: 'sa-t1', parentSpanId: 'sa',
    payload: { tool_call_id: 'sa-t1', duration_ms: 980,
      result: { id: 'SR-LOC-014', asil: 'B', satisfied: false, gap: 'Allan variance evidence missing' } } },
  { offsetMs: 3300, agentName: 'safety_agent', type: 'agent_completed', spanId: 'sa', parentSpanId: 's',
    payload: { duration_ms: 2600, tokens_in: 3300, tokens_out: 880,
      result: { asil_level: 'B', evidence_complete: false, gaps: 1 } } },

  { offsetMs: 900, agentName: 'security_agent', type: 'agent_invoked', spanId: 'se', parentSpanId: 's',
    payload: { task: 'IMU surface attack analysis' } },
  { offsetMs: 2800, agentName: 'security_agent', type: 'agent_completed', spanId: 'se', parentSpanId: 's',
    payload: { duration_ms: 1900, tokens_in: 2200, tokens_out: 540,
      result: { cves_found: 0, threat_score: 'LOW' } } },

  { offsetMs: 3500, agentName: 'test_agent', type: 'agent_invoked', spanId: 't', parentSpanId: 's',
    payload: { task: 'Select calibration regression suite' } },
  { offsetMs: 4400, agentName: 'test_agent', type: 'agent_completed', spanId: 't', parentSpanId: 's',
    payload: { duration_ms: 900, tokens_in: 2000, tokens_out: 500,
      result: { tests_selected: 142, environments: 1, coverage_estimate: 88 } } },

  { offsetMs: 4700, agentName: 'integration_agent', type: 'agent_invoked', spanId: 'i', parentSpanId: 's',
    payload: { task: 'SBOM (Eigen, ROS msg deps)' } },
  { offsetMs: 5400, agentName: 'integration_agent', type: 'agent_completed', spanId: 'i', parentSpanId: 's',
    payload: { duration_ms: 700, tokens_in: 1500, tokens_out: 420,
      result: { sbom_compliant: true, license_status: 'all_clear' } } },

  { offsetMs: 5700, agentName: 'deployment_agent', type: 'agent_invoked', spanId: 'd', parentSpanId: 's',
    payload: { task: 'Promotion gate' } },
  { offsetMs: 6500, agentName: 'deployment_agent', type: 'memory_write', spanId: 'd-m1', parentSpanId: 'd',
    payload: { strategy: 'SUMMARY',
      content: 'PR #1845: ASIL-B evidence gap on Allan variance. BLOCKED pending requirement update.',
      namespace: 'pr/1845' } },
  { offsetMs: 6800, agentName: 'deployment_agent', type: 'agent_completed', spanId: 'd', parentSpanId: 's',
    payload: { duration_ms: 1100, tokens_in: 1800, tokens_out: 480,
      result: { promotion_verdict: 'BLOCK', blocker: 'ASIL-B evidence incomplete' } } },

  { offsetMs: 7000, agentName: 'supervisor', type: 'agent_completed', spanId: 's', parentSpanId: 'p',
    payload: { duration_ms: 6920, tokens_in: 14400, tokens_out: 3700,
      result: { verdict: 'BLOCK', findings_total: 2, auto_fixed: 0 } } },
  { offsetMs: 7100, agentName: 'supervisor', type: 'pipeline_completed', spanId: 'p', parentSpanId: null,
    payload: { duration_ms: 7100, totalTokens: 18100, totalCost: 0.14,
      agentsInvoked: ['quality_agent', 'safety_agent', 'security_agent', 'test_agent', 'integration_agent', 'deployment_agent'] } },
];

const PR_1845: SessionDescriptor = {
  id: 'pr-1845',
  label: 'PR #1845 — IMU corrector calibration',
  meta: 'yesterday',
  fileId: 'autoware/sensing/imu_corrector.cpp',
  fileSummary: '7.7 KB · ASIL-B · 308 LOC',
  playableEvents: PR_1845_PLAYABLE,
  frozenEvents: buildFrozen(PR_1845_PLAYABLE, '2026-04-29T11:08:00.000Z', 'pr-1845', 'RUN-1845-031'),
  headline: { passRate: 71, findingsAutoFixed: 0, avgRunTimeSec: 7, asilCoverage: 86 },
};

// ---------------------------------------------------------------------------
// Session 3 — PR #1840 — MPC controller tuning
// ---------------------------------------------------------------------------

const PR_1840_PLAYABLE: PlayableEvent[] = [
  { offsetMs: 0, agentName: 'supervisor', type: 'pipeline_started', spanId: 'p', parentSpanId: null,
    payload: { fileId: 'autoware/control/mpc_lateral_controller.cpp', mode: 'base' } },
  { offsetMs: 70, agentName: 'supervisor', type: 'agent_invoked', spanId: 's', parentSpanId: 'p',
    payload: { task: 'Tuning weights changed in MPC lateral controller' } },
  { offsetMs: 220, agentName: 'supervisor', type: 'memory_read', spanId: 's-m1', parentSpanId: 's',
    payload: { strategy: 'USER_PREFERENCE', query: 'previously approved MPC tuning bounds',
      matches: [
        { text: 'Khaled approved Q_lat ∈ [0.5, 5.0] last quarter', score: 0.94 },
      ], duration_ms: 32 } },
  { offsetMs: 350, agentName: 'supervisor', type: 'agent_thinking', spanId: 's-t1', parentSpanId: 's',
    payload: { delta: 'Numerical-only change, no API. Skip Security; Quality + Test only.', done: true } },

  { offsetMs: 500, agentName: 'quality_agent', type: 'agent_invoked', spanId: 'q', parentSpanId: 's',
    payload: { task: 'Numerical stability + matrix ops' } },
  { offsetMs: 700, agentName: 'quality_agent', type: 'tool_call', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_name: 'misra_checker', via: 'agentcore_gateway', tool_call_id: 'q-t1',
      params: { file: 'mpc_lateral_controller.cpp', ruleset: 'AUTOSAR' } } },
  { offsetMs: 1700, agentName: 'quality_agent', type: 'tool_result', spanId: 'q-t1', parentSpanId: 'q',
    payload: { tool_call_id: 'q-t1', duration_ms: 980,
      result: { findings: [] } } },
  { offsetMs: 2100, agentName: 'quality_agent', type: 'code_execution', spanId: 'q-c1', parentSpanId: 'q',
    payload: { language: 'python', duration_ms: 340, stderr: null,
      code: '# Q matrix conditioning check\nimport numpy as np\nQ = np.diag([2.0, 0.8, 1.2, 0.5])\nprint("cond:", np.linalg.cond(Q))',
      stdout: 'cond: 4.0' } },
  { offsetMs: 2700, agentName: 'quality_agent', type: 'agent_completed', spanId: 'q', parentSpanId: 's',
    payload: { duration_ms: 2200, tokens_in: 2800, tokens_out: 720,
      result: { critical: 0, warning: 0, advisory: 0, complexity: 5 } } },

  { offsetMs: 2900, agentName: 'test_agent', type: 'agent_invoked', spanId: 't', parentSpanId: 's',
    payload: { task: 'Lateral tracking regression' } },
  { offsetMs: 4000, agentName: 'test_agent', type: 'agent_completed', spanId: 't', parentSpanId: 's',
    payload: { duration_ms: 1100, tokens_in: 1800, tokens_out: 460,
      result: { tests_selected: 47, environments: 1, coverage_estimate: 92 } } },

  { offsetMs: 4200, agentName: 'integration_agent', type: 'agent_invoked', spanId: 'i', parentSpanId: 's',
    payload: { task: 'No SBOM delta expected' } },
  { offsetMs: 4700, agentName: 'integration_agent', type: 'agent_completed', spanId: 'i', parentSpanId: 's',
    payload: { duration_ms: 500, tokens_in: 1100, tokens_out: 320,
      result: { sbom_compliant: true } } },

  { offsetMs: 4900, agentName: 'deployment_agent', type: 'agent_invoked', spanId: 'd', parentSpanId: 's',
    payload: { task: 'Promotion gate' } },
  { offsetMs: 5400, agentName: 'deployment_agent', type: 'memory_write', spanId: 'd-m1', parentSpanId: 'd',
    payload: { strategy: 'SUMMARY',
      content: 'PR #1840: MPC tuning passed all gates, promoted to integration',
      namespace: 'pr/1840' } },
  { offsetMs: 5800, agentName: 'deployment_agent', type: 'agent_completed', spanId: 'd', parentSpanId: 's',
    payload: { duration_ms: 900, tokens_in: 1500, tokens_out: 400,
      result: { promotion_verdict: 'APPROVE', target_stage: 'integration' } } },

  { offsetMs: 6000, agentName: 'supervisor', type: 'agent_completed', spanId: 's', parentSpanId: 'p',
    payload: { duration_ms: 5930, tokens_in: 9200, tokens_out: 2400,
      result: { verdict: 'APPROVE', findings_total: 0, auto_fixed: 0 } } },
  { offsetMs: 6100, agentName: 'supervisor', type: 'pipeline_completed', spanId: 'p', parentSpanId: null,
    payload: { duration_ms: 6100, totalTokens: 11600, totalCost: 0.09,
      agentsInvoked: ['quality_agent', 'test_agent', 'integration_agent', 'deployment_agent'] } },
];

const PR_1840: SessionDescriptor = {
  id: 'pr-1840',
  label: 'PR #1840 — MPC controller tuning',
  meta: '2 weeks ago',
  fileId: 'autoware/control/mpc_lateral_controller.cpp',
  fileSummary: '28 KB · ASIL-C · 712 LOC',
  playableEvents: PR_1840_PLAYABLE,
  frozenEvents: buildFrozen(PR_1840_PLAYABLE, '2026-04-16T08:14:00.000Z', 'pr-1840', 'RUN-1840-008'),
  headline: { passRate: 100, findingsAutoFixed: 0, avgRunTimeSec: 6, asilCoverage: 100 },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SAMPLE_SESSIONS: Record<string, SessionDescriptor> = {
  'pr-1847': PR_1847,
  'pr-1845': PR_1845,
  'pr-1840': PR_1840,
};

export const SAMPLE_SESSION_LIST: SessionDescriptor[] = [PR_1847, PR_1845, PR_1840];

/** Get a session descriptor by id, falling back to PR_1847 if unknown. */
export function getSession(id: string | null | undefined): SessionDescriptor | null {
  if (!id) return null;
  if (id.startsWith('new-')) return null; // new sessions start empty
  return SAMPLE_SESSIONS[id] ?? PR_1847;
}
