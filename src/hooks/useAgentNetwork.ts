import { useMemo } from 'react';
import type { A2AMessage, AgentEvent, AgentName } from '../types/agents';

const KNOWN_AGENTS: AgentName[] = [
  'supervisor',
  'quality_agent',
  'safety_agent',
  'security_agent',
  'test_agent',
  'deployment_agent',
  'integration_agent',
];

interface NetworkNode {
  id: AgentName;
  activity: number;
}

interface NetworkEdge {
  from: AgentName;
  to: AgentName;
  messages: A2AMessage[];
  lastAt: string;
}

interface UseAgentNetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

function isKnownAgent(name: unknown): name is AgentName {
  return typeof name === 'string' && (KNOWN_AGENTS as string[]).includes(name);
}

/**
 * Derives a directed graph from a2a_message events.
 *
 * `activity` is a recency-weighted count: every message in the last 60s counts
 * as 1, older messages decay linearly to 0.2 over 5 minutes.
 */
export function useAgentNetwork(events: AgentEvent[]): UseAgentNetworkResult {
  return useMemo(() => {
    const edgeMap = new Map<string, NetworkEdge>();
    const activity = new Map<AgentName, number>();
    const now = Date.now();

    for (const ev of events) {
      if (ev.type !== 'a2a_message') continue;
      const p = ev.payload || {};
      if (!isKnownAgent(p.from) || !isKnownAgent(p.to)) continue;

      const msg: A2AMessage = {
        from: p.from,
        to: p.to,
        message: typeof p.message === 'string' ? p.message : '',
        purpose: typeof p.purpose === 'string' ? p.purpose : '',
      };

      const key = `${msg.from}->${msg.to}`;
      let edge = edgeMap.get(key);
      if (!edge) {
        edge = { from: msg.from, to: msg.to, messages: [], lastAt: ev.timestamp };
        edgeMap.set(key, edge);
      }
      edge.messages.push(msg);
      if (ev.timestamp > edge.lastAt) edge.lastAt = ev.timestamp;

      // Recency-weighted activity
      const ts = Date.parse(ev.timestamp);
      let weight = 0.2;
      if (!Number.isNaN(ts)) {
        const ageMs = now - ts;
        if (ageMs <= 60_000) weight = 1;
        else if (ageMs <= 300_000) weight = 1 - (ageMs - 60_000) / 300_000;
        else weight = 0.2;
      }
      activity.set(msg.from, (activity.get(msg.from) ?? 0) + weight);
      activity.set(msg.to, (activity.get(msg.to) ?? 0) + weight * 0.5);
    }

    const nodes: NetworkNode[] = KNOWN_AGENTS.map((id) => ({
      id,
      activity: activity.get(id) ?? 0,
    }));

    const edges = Array.from(edgeMap.values());

    return { nodes, edges };
  }, [events]);
}
