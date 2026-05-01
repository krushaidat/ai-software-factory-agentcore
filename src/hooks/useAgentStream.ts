import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentEvent, AgentName, EventType } from '../types/agents';
import {
  buildReasoningTree,
  parseAgentEvent,
  type ReasoningTreeNode,
} from '../services/agentcore-events';
import { useWebSocket } from './useWebSocket';

const MAX_EVENTS = 5000;

const EVENT_TYPES: EventType[] = [
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
];

function emptyEventsByType(): Record<EventType, AgentEvent[]> {
  const r = {} as Record<EventType, AgentEvent[]>;
  for (const t of EVENT_TYPES) r[t] = [];
  return r;
}

interface UseAgentStreamResult {
  events: AgentEvent[];
  eventsByType: Record<EventType, AgentEvent[]>;
  reasoningTree: ReasoningTreeNode[];
  currentAgent: AgentName | null;
  clear: () => void;
}

/**
 * Subscribes to the WebSocket stream and exposes typed AgentCore events.
 *
 * Listens to every event type defined in CONTRACTS.md as a separate WS action
 * (matches the existing `useWebSocket` dispatch model), plus a generic
 * `agent_event` channel for backends that multiplex everything onto one action.
 */
export function useAgentStream(sessionId: string): UseAgentStreamResult {
  const { subscribe } = useWebSocket(sessionId);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  // Latest agent reference avoids needless re-renders.
  const lastAgentRef = useRef<AgentName | null>(null);
  const [currentAgent, setCurrentAgent] = useState<AgentName | null>(null);

  const ingest = useCallback((data: unknown) => {
    const ev = parseAgentEvent(data);
    if (!ev) return;
    setEvents((prev) => {
      const next = prev.length >= MAX_EVENTS ? prev.slice(prev.length - MAX_EVENTS + 1) : prev;
      return [...next, ev];
    });
    if (ev.agentName !== lastAgentRef.current) {
      lastAgentRef.current = ev.agentName;
      setCurrentAgent(ev.agentName);
    }
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    // Subscribe to per-type actions (one channel per event type).
    for (const t of EVENT_TYPES) {
      unsubs.push(subscribe(t, ingest));
    }
    // Generic multiplexed channel.
    unsubs.push(subscribe('agent_event', ingest));
    return () => {
      for (const u of unsubs) u();
    };
  }, [subscribe, ingest]);

  const eventsByType = useMemo(() => {
    const map = emptyEventsByType();
    for (const ev of events) {
      map[ev.type].push(ev);
    }
    return map;
  }, [events]);

  const reasoningTree = useMemo(() => buildReasoningTree(events), [events]);

  const clear = useCallback(() => {
    setEvents([]);
    lastAgentRef.current = null;
    setCurrentAgent(null);
  }, []);

  return { events, eventsByType, reasoningTree, currentAgent, clear };
}
