/**
 * Hardcoded sample reasoning trace for the brake ECU PR scenario.
 *
 * Used in offline mode (`!isLive` and no events yet) so demos and screenshots
 * can show the live agent reasoning surface without needing a backend.
 *
 * The shape matches `AgentEvent` exactly as defined in `backend/agents/CONTRACTS.md`.
 */

import type { AgentEvent } from '../types/agents';

const SESSION = 'demo-session';
const RUN = 'RUN-2026-1847-047';

// Walking timestamp generator — keeps events monotonically increasing while
// staying readable.
function ts(offsetMs: number): string {
  const base = new Date('2026-04-30T14:32:01.000Z').getTime();
  return new Date(base + offsetMs).toISOString();
}

export const SAMPLE_EVENTS: AgentEvent[] = [
  // ---- Pipeline begins ----
  {
    type: 'pipeline_started',
    timestamp: ts(0),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-pipeline',
    parentSpanId: null,
    payload: { fileId: 'brake-ecu/can_timeout_handler.c', mode: 'optB' },
  },

  // ---- Supervisor invocation ----
  {
    type: 'agent_invoked',
    timestamp: ts(60),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-supervisor',
    parentSpanId: 'span-pipeline',
    payload: { task: 'Analyzing PR for brake ECU CAN timeout handler' },
  },
  {
    type: 'memory_read',
    timestamp: ts(120),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-mem-read-1',
    parentSpanId: 'span-supervisor',
    payload: {
      strategy: 'SEMANTIC',
      query: 'CAN timeout patterns in brake ECU codebases',
      matches: [
        { text: 'DC-2025-0847 — 50ms timeout on bus error caused HARA escalation', score: 0.92 },
        { text: 'DC-2024-1102 — Watchdog reset preferred over silent retry', score: 0.87 },
        { text: 'DC-2024-0533 — ASIL-B requires explicit timeout evidence', score: 0.81 },
      ],
      duration_ms: 45,
    },
  },
  {
    type: 'agent_thinking',
    timestamp: ts(165),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-think-1',
    parentSpanId: 'span-supervisor',
    payload: {
      delta:
        'This PR touches CAN_TimeoutHandler in the brake ECU. Past similar changes failed promotion when ASIL-B evidence was missing — I will route to Quality and Safety in parallel, then Security for CVE diff.',
      done: true,
    },
  },

  // ---- Quality agent branch ----
  {
    type: 'agent_invoked',
    timestamp: ts(220),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-quality',
    parentSpanId: 'span-supervisor',
    payload: { task: 'Scanning for MISRA violations and complexity hotspots' },
  },
  {
    type: 'tool_call',
    timestamp: ts(260),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-tool-misra',
    parentSpanId: 'span-quality',
    payload: {
      tool_name: 'misra_checker',
      via: 'agentcore_gateway',
      params: { file: 'can_timeout_handler.c', ruleset: 'MISRA-C:2012' },
      tool_call_id: 'tc-misra-001',
    },
  },
  {
    type: 'tool_result',
    timestamp: ts(680),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-tool-misra',
    parentSpanId: 'span-quality',
    payload: {
      tool_call_id: 'tc-misra-001',
      result: {
        findings: [
          { rule: 'MISRA-11.3', severity: 'critical', line: 47, msg: 'Cast between unrelated pointer types' },
          { rule: 'MISRA-17.7', severity: 'warning', line: 92, msg: 'Return value of non-void function not used' },
          { rule: 'MISRA-15.5', severity: 'advisory', line: 134, msg: 'Function has more than one return path' },
        ],
      },
      duration_ms: 420,
      error: null,
    },
  },
  {
    type: 'code_execution',
    timestamp: ts(720),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-code-cyclo',
    parentSpanId: 'span-quality',
    payload: {
      language: 'python',
      code:
        "import lizard\nresult = lizard.analyze_file('can_timeout_handler.c')\nfor fn in result.function_list:\n    print(f'{fn.name}: cyclomatic={fn.cyclomatic_complexity}')",
      stdout:
        'CAN_TimeoutHandler: cyclomatic=14\nCAN_ResetBus: cyclomatic=6\nCAN_LogError: cyclomatic=11\nCAN_RetryFrame: cyclomatic=12\n\n3 functions exceed threshold (10)',
      stderr: null,
      duration_ms: 180,
    },
  },
  {
    type: 'agent_thinking',
    timestamp: ts(910),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-think-quality',
    parentSpanId: 'span-quality',
    payload: {
      delta:
        'The CAN_TimeoutHandler has cyclomatic complexity 14 — well above the 10 threshold for safety-critical code. Combined with MISRA-11.3 critical, this needs refactoring before promotion.',
      done: true,
    },
  },
  {
    type: 'agent_completed',
    timestamp: ts(1450),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-quality',
    parentSpanId: 'span-supervisor',
    payload: {
      result: { findings_count: 3, critical: 1, warnings: 1, complexity_violations: 3 },
      tokens_in: 2840,
      tokens_out: 612,
      duration_ms: 1230,
    },
  },

  // ---- Safety agent branch ----
  {
    type: 'agent_invoked',
    timestamp: ts(280),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-safety',
    parentSpanId: 'span-supervisor',
    payload: { task: 'Building ASIL-B evidence chain for BR-ECU-CAN-007' },
  },
  {
    type: 'a2a_message',
    timestamp: ts(1500),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-a2a-1',
    parentSpanId: 'span-safety',
    payload: {
      from: 'safety_agent',
      to: 'quality_agent',
      message: 'Need cyclomatic complexity for CAN_TimeoutHandler to attach to ASIL-B evidence',
      purpose: 'asil_evidence',
    },
  },
  {
    type: 'a2a_message',
    timestamp: ts(1585),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'quality_agent',
    spanId: 'span-a2a-2',
    parentSpanId: 'span-safety',
    payload: {
      from: 'quality_agent',
      to: 'safety_agent',
      message: 'Cyclomatic = 14 (threshold 10). 3 functions over threshold. MISRA-11.3 critical at line 47.',
      purpose: 'asil_evidence',
    },
  },
  {
    type: 'tool_call',
    timestamp: ts(1620),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-tool-req',
    parentSpanId: 'span-safety',
    payload: {
      tool_name: 'requirement_lookup',
      via: 'agentcore_gateway',
      params: { id: 'BR-ECU-CAN-007' },
      tool_call_id: 'tc-req-002',
    },
  },
  {
    type: 'tool_result',
    timestamp: ts(1770),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-tool-req',
    parentSpanId: 'span-safety',
    payload: {
      tool_call_id: 'tc-req-002',
      result: {
        id: 'BR-ECU-CAN-007',
        title: 'CAN bus timeout shall trigger fail-safe within 50ms',
        asil: 'B',
        linked_tests: ['HIL-003', 'HIL-014'],
        status: 'pending_evidence',
      },
      duration_ms: 150,
      error: null,
    },
  },
  {
    type: 'memory_write',
    timestamp: ts(1820),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-mem-write-1',
    parentSpanId: 'span-safety',
    payload: {
      strategy: 'SEMANTIC',
      content:
        'BR-ECU-CAN-007 ASIL-B chain: complexity=14 violates threshold; HIL-003 still pending; CVE diff clean',
      namespace: 'evidence/brake-ecu/' + RUN,
    },
  },
  {
    type: 'agent_completed',
    timestamp: ts(2380),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'safety_agent',
    spanId: 'span-safety',
    parentSpanId: 'span-supervisor',
    payload: {
      result: { asil_chain: 'incomplete', missing: ['HIL-003 result'], blocking: true },
      tokens_in: 3120,
      tokens_out: 740,
      duration_ms: 2100,
    },
  },

  // ---- Security agent branch ----
  {
    type: 'agent_invoked',
    timestamp: ts(300),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'security_agent',
    spanId: 'span-security',
    parentSpanId: 'span-supervisor',
    payload: { task: 'CVE diff and supply chain review' },
  },
  {
    type: 'browser_action',
    timestamp: ts(450),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'security_agent',
    spanId: 'span-browser-1',
    parentSpanId: 'span-security',
    payload: {
      action: 'navigate',
      url: 'https://nvd.nist.gov/vuln/search/results?query=can+bus+timeout+ecu',
      result_summary: '0 new CVEs in scope (last 30d). 2 existing watch items unchanged.',
    },
  },
  {
    type: 'tool_call',
    timestamp: ts(820),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'security_agent',
    spanId: 'span-tool-sbom',
    parentSpanId: 'span-security',
    payload: {
      tool_name: 'sbom_diff',
      via: 'agentcore_gateway',
      params: { base: 'main', head: 'feature/can-timeout-fix' },
      tool_call_id: 'tc-sbom-003',
    },
  },
  {
    type: 'tool_result',
    timestamp: ts(1090),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'security_agent',
    spanId: 'span-tool-sbom',
    parentSpanId: 'span-security',
    payload: {
      tool_call_id: 'tc-sbom-003',
      result: { added: 0, removed: 0, upgraded: 0, vulnerable: [] },
      duration_ms: 270,
      error: null,
    },
  },
  {
    type: 'agent_completed',
    timestamp: ts(1640),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'security_agent',
    spanId: 'span-security',
    parentSpanId: 'span-supervisor',
    payload: {
      result: { verdict: 'clean', new_cves: 0, sbom_drift: 0 },
      tokens_in: 1480,
      tokens_out: 290,
      duration_ms: 1340,
    },
  },

  // ---- Test agent branch ----
  {
    type: 'agent_invoked',
    timestamp: ts(2400),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'test_agent',
    spanId: 'span-test',
    parentSpanId: 'span-supervisor',
    payload: { task: 'Mapping changed lines to HIL test coverage' },
  },
  {
    type: 'tool_call',
    timestamp: ts(2440),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'test_agent',
    spanId: 'span-tool-cov',
    parentSpanId: 'span-test',
    payload: {
      tool_name: 'hil_coverage_lookup',
      via: 'agentcore_gateway',
      params: { file: 'can_timeout_handler.c', range: '40-150' },
      tool_call_id: 'tc-cov-004',
    },
  },
  {
    type: 'tool_result',
    timestamp: ts(2680),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'test_agent',
    spanId: 'span-tool-cov',
    parentSpanId: 'span-test',
    payload: {
      tool_call_id: 'tc-cov-004',
      result: { covered: ['HIL-014'], pending: ['HIL-003'], gaps: [] },
      duration_ms: 240,
      error: null,
    },
  },
  {
    type: 'agent_completed',
    timestamp: ts(3120),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'test_agent',
    spanId: 'span-test',
    parentSpanId: 'span-supervisor',
    payload: {
      result: { coverage_ok: false, missing: ['HIL-003'] },
      tokens_in: 980,
      tokens_out: 184,
      duration_ms: 720,
    },
  },

  // ---- Supervisor verdict ----
  {
    type: 'agent_thinking',
    timestamp: ts(3180),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-think-final',
    parentSpanId: 'span-supervisor',
    payload: {
      delta:
        'Quality flagged 1 critical MISRA + complexity 14. Safety chain incomplete (HIL-003 pending). Security clean. Verdict: BLOCK promotion until HIL-003 lands and complexity is reduced.',
      done: true,
    },
  },
  {
    type: 'agent_completed',
    timestamp: ts(3400),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-supervisor',
    parentSpanId: 'span-pipeline',
    payload: {
      result: {
        verdict: 'BLOCK',
        reasons: ['HIL-003 pending', 'MISRA-11.3 critical', 'Cyclomatic 14 > threshold'],
      },
      tokens_in: 12480,
      tokens_out: 2367,
      duration_ms: 3340,
    },
  },
  {
    type: 'pipeline_completed',
    timestamp: ts(3420),
    sessionId: SESSION,
    runId: RUN,
    agentName: 'supervisor',
    spanId: 'span-pipeline',
    parentSpanId: null,
    payload: {
      duration_ms: 23456,
      totalTokens: 12847,
      totalCost: 0.42,
      agentsInvoked: ['quality_agent', 'safety_agent', 'security_agent', 'test_agent'],
    },
  },
];

export const SAMPLE_RUN_META = {
  runId: RUN,
  durationMs: 23456,
  totalTokens: 12847,
  totalCost: 0.42,
} as const;
