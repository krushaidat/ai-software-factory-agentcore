import { useMemo } from 'react';
import type {
  AgentEvent,
  AgentName,
  CostBreakdown,
  CostUpdate,
} from '../types/agents';

const EMPTY_BREAKDOWN: CostBreakdown = {
  bedrock: 0,
  agentcore_runtime: 0,
  memory: 0,
  browser: 0,
  code_interpreter: 0,
};

function emptyByAgent(): Record<AgentName, number> {
  return {
    supervisor: 0,
    quality_agent: 0,
    safety_agent: 0,
    security_agent: 0,
    test_agent: 0,
    deployment_agent: 0,
    integration_agent: 0,
  };
}

interface UseCostTrackerResult extends CostUpdate {
  byAgent: Record<AgentName, number>;
}

/**
 * Reads the most recent `cost_update` event for headline totals and computes
 * a per-agent token-cost approximation from `agent_completed` events.
 */
export function useCostTracker(events: AgentEvent[]): UseCostTrackerResult {
  return useMemo(() => {
    let sessionTotal = 0;
    let todayTotal = 0;
    let breakdown: CostBreakdown = { ...EMPTY_BREAKDOWN };
    const byAgent = emptyByAgent();

    for (const ev of events) {
      if (ev.type === 'cost_update') {
        const p = ev.payload || {};
        const sessionVal = p.sessionTotal ?? p.session_total;
        const todayVal = p.todayTotal ?? p.today_total;
        if (typeof sessionVal === 'number') sessionTotal = sessionVal;
        if (typeof todayVal === 'number') todayTotal = todayVal;
        if (p.breakdown && typeof p.breakdown === 'object') {
          breakdown = {
            bedrock: Number(p.breakdown.bedrock) || 0,
            agentcore_runtime: Number(p.breakdown.agentcore_runtime) || 0,
            memory: Number(p.breakdown.memory) || 0,
            browser: Number(p.breakdown.browser) || 0,
            code_interpreter: Number(p.breakdown.code_interpreter) || 0,
          };
        }
      } else if (ev.type === 'agent_completed') {
        const p = ev.payload || {};
        const tokens = (Number(p.tokens_in) || 0) + (Number(p.tokens_out) || 0);
        // Rough $/1K tokens heuristic — backend cost_update is the source of truth
        // for totals, this is just for the per-agent breakdown bar.
        byAgent[ev.agentName] += tokens / 1000 * 0.003;
      }
    }

    return { sessionTotal, todayTotal, breakdown, byAgent };
  }, [events]);
}
