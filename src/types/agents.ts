/**
 * AgentCore event types — see backend/agents/CONTRACTS.md for the source of truth.
 */

export type AgentName =
  | 'supervisor'
  | 'quality_agent'
  | 'safety_agent'
  | 'security_agent'
  | 'test_agent'
  | 'deployment_agent'
  | 'integration_agent';

export type EventType =
  | 'agent_thinking'
  | 'agent_invoked'
  | 'agent_completed'
  | 'agent_failed'
  | 'tool_call'
  | 'tool_result'
  | 'a2a_message'
  | 'memory_read'
  | 'memory_write'
  | 'code_execution'
  | 'browser_action'
  | 'pipeline_started'
  | 'pipeline_completed'
  | 'pipeline_failed'
  | 'cost_update';

export interface AgentEvent {
  type: EventType;
  timestamp: string;
  sessionId: string;
  runId: string;
  agentName: AgentName;
  spanId: string;
  parentSpanId: string | null;
  payload: any;
}

export interface ToolCall {
  tool_call_id: string;
  tool_name: string;
  via: 'agentcore_gateway' | 'code_interpreter' | 'browser';
  params: Record<string, any>;
  result?: any;
  durationMs?: number;
  error?: string | null;
}

export interface A2AMessage {
  from: AgentName;
  to: AgentName;
  message: string;
  purpose: string;
}

export interface MemoryEntry {
  strategy: string;
  query?: string;
  content?: string;
  matches?: any[];
  namespace?: string;
}

export interface CodeExecution {
  language: string;
  code: string;
  stdout: string;
  stderr: string | null;
  durationMs: number;
}

export interface BrowserAction {
  action: string;
  url: string;
  resultSummary: string;
  screenshotUrl?: string;
}

export interface CostBreakdown {
  bedrock: number;
  agentcore_runtime: number;
  memory: number;
  browser: number;
  code_interpreter: number;
}

export interface CostUpdate {
  sessionTotal: number;
  todayTotal: number;
  breakdown: CostBreakdown;
}
