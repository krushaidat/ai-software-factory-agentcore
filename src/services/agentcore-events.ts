/**
 * Parses incoming WebSocket payloads into typed AgentEvents and builds a
 * normalized reasoning tree grouped by spanId / parentSpanId.
 *
 * See backend/agents/CONTRACTS.md for the wire format.
 */

import type { AgentEvent, AgentName, EventType } from '../types/agents';

const KNOWN_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  'agent_thinking',
  'agent_invoked',
  'agent_completed',
  'agent_failed',
  'tool_call',
  'tool_result',
  'a2a_message',
  'memory_read',
  'memory_write',
  'code_execution',
  'browser_action',
  'pipeline_started',
  'pipeline_completed',
  'pipeline_failed',
  'cost_update',
]);

const KNOWN_AGENTS: ReadonlySet<AgentName> = new Set<AgentName>([
  'supervisor',
  'quality_agent',
  'safety_agent',
  'security_agent',
  'test_agent',
  'deployment_agent',
  'integration_agent',
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parse an unknown WebSocket payload into a typed AgentEvent (or null). */
export function parseAgentEvent(data: unknown): AgentEvent | null {
  if (!isObject(data)) return null;

  const type = data.type;
  if (typeof type !== 'string' || !KNOWN_EVENT_TYPES.has(type as EventType)) {
    return null;
  }

  const agentNameRaw = typeof data.agentName === 'string' ? data.agentName : 'supervisor';
  const agentName = (KNOWN_AGENTS.has(agentNameRaw as AgentName)
    ? agentNameRaw
    : 'supervisor') as AgentName;

  return {
    type: type as EventType,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    runId: typeof data.runId === 'string' ? data.runId : '',
    agentName,
    spanId: typeof data.spanId === 'string' ? data.spanId : '',
    parentSpanId: typeof data.parentSpanId === 'string' ? data.parentSpanId : null,
    payload: data.payload ?? {},
  };
}

export interface ReasoningTreeNode {
  spanId: string;
  type: EventType;
  agentName: AgentName;
  timestamp: string;
  /** Human-readable label, e.g. "Quality agent invoked" */
  label: string;
  /** Short detail string (truncated where appropriate) */
  detail: string;
  children: ReasoningTreeNode[];
  status: 'running' | 'completed' | 'failed';
  durationMs?: number;
  payload: any;
}

function shortLabel(event: AgentEvent): string {
  switch (event.type) {
    case 'agent_invoked':
      return `${event.agentName} invoked`;
    case 'agent_completed':
      return `${event.agentName} completed`;
    case 'agent_failed':
      return `${event.agentName} failed`;
    case 'agent_thinking':
      return `${event.agentName} thinking`;
    case 'tool_call':
      return `tool: ${event.payload?.tool_name ?? 'unknown'}`;
    case 'tool_result':
      return `tool result`;
    case 'a2a_message':
      return `${event.payload?.from ?? '?'} \u2192 ${event.payload?.to ?? '?'}`;
    case 'memory_read':
      return `memory read (${event.payload?.strategy ?? '-'})`;
    case 'memory_write':
      return `memory write (${event.payload?.strategy ?? '-'})`;
    case 'code_execution':
      return `code: ${event.payload?.language ?? 'python'}`;
    case 'browser_action':
      return `browser: ${event.payload?.action ?? 'action'}`;
    case 'pipeline_started':
      return 'pipeline started';
    case 'pipeline_completed':
      return 'pipeline completed';
    case 'pipeline_failed':
      return 'pipeline failed';
    case 'cost_update':
      return 'cost update';
    default:
      return event.type;
  }
}

function shortDetail(event: AgentEvent): string {
  const p = event.payload || {};
  switch (event.type) {
    case 'agent_invoked':
      return typeof p.task === 'string' ? p.task : '';
    case 'agent_completed':
      return p.duration_ms ? `${p.duration_ms} ms` : '';
    case 'agent_failed':
      return typeof p.error === 'string' ? p.error : '';
    case 'tool_call':
      return p.via ? `via ${p.via}` : '';
    case 'tool_result':
      return p.duration_ms ? `${p.duration_ms} ms` : '';
    case 'a2a_message':
      return typeof p.message === 'string' ? p.message.slice(0, 80) : '';
    case 'memory_read':
      return typeof p.query === 'string' ? p.query.slice(0, 80) : '';
    case 'memory_write':
      return typeof p.content === 'string' ? p.content.slice(0, 80) : '';
    case 'code_execution':
      return p.duration_ms ? `${p.duration_ms} ms` : '';
    case 'browser_action':
      return typeof p.url === 'string' ? p.url : '';
    case 'pipeline_completed':
      return p.totalCost ? `$${Number(p.totalCost).toFixed(2)}` : '';
    default:
      return '';
  }
}

/** Build a tree of ReasoningTreeNodes from a flat event array. */
export function buildReasoningTree(events: AgentEvent[]): ReasoningTreeNode[] {
  const nodes = new Map<string, ReasoningTreeNode>();
  const roots: ReasoningTreeNode[] = [];

  // First pass: create / merge nodes keyed by spanId.
  for (const ev of events) {
    if (!ev.spanId) continue;

    let node = nodes.get(ev.spanId);
    if (!node) {
      node = {
        spanId: ev.spanId,
        type: ev.type,
        agentName: ev.agentName,
        timestamp: ev.timestamp,
        label: shortLabel(ev),
        detail: shortDetail(ev),
        children: [],
        status: 'running',
        payload: ev.payload,
      };
      nodes.set(ev.spanId, node);
    }

    // Merge — completion / failure events upgrade the node status.
    if (ev.type === 'agent_completed' || ev.type === 'tool_result') {
      node.status = 'completed';
      const dur = ev.payload?.duration_ms ?? ev.payload?.durationMs;
      if (typeof dur === 'number') node.durationMs = dur;
    } else if (ev.type === 'agent_failed' || ev.type === 'pipeline_failed') {
      node.status = 'failed';
    } else if (ev.type === 'pipeline_completed') {
      node.status = 'completed';
    }
  }

  // Second pass: link parents.
  for (const ev of events) {
    if (!ev.spanId) continue;
    const node = nodes.get(ev.spanId);
    if (!node) continue;

    if (ev.parentSpanId && nodes.has(ev.parentSpanId)) {
      const parent = nodes.get(ev.parentSpanId)!;
      if (!parent.children.some((c) => c.spanId === node.spanId)) {
        parent.children.push(node);
      }
    } else {
      if (!roots.some((r) => r.spanId === node.spanId)) {
        roots.push(node);
      }
    }
  }

  return roots;
}
