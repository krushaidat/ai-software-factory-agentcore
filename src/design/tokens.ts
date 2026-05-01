/**
 * Design tokens for the Mission Control workspace.
 *
 * Use these alongside the existing `C` color palette in `src/config/colors.ts`.
 * Agent-specific colors live here; semantic UI colors stay in `C`.
 */

import type { AgentName } from '../types/agents';

export const tokens = {
  agentColors: {
    supervisor: '#0ea5a0',
    quality_agent: '#3b82f6',
    safety_agent: '#f59e0b',
    security_agent: '#ec4899',
    test_agent: '#8b5cf6',
    deployment_agent: '#10b981',
    integration_agent: '#ff9900',
  } as Record<AgentName, string>,

  agentLabels: {
    supervisor: 'Supervisor',
    quality_agent: 'Quality',
    safety_agent: 'Safety',
    security_agent: 'Security',
    test_agent: 'Test',
    deployment_agent: 'Deploy',
    integration_agent: 'Integration',
  } as Record<AgentName, string>,

  motion: {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },

  glass: {
    bg: 'rgba(15, 23, 36, 0.6)',
    border: 'rgba(26, 39, 68, 0.5)',
    blur: '12px',
  },

  shadows: {
    card: '0 4px 24px rgba(0,0,0,0.3)',
    lift: '0 8px 32px rgba(14,165,160,0.15)',
    glow: '0 0 0 1px rgba(14,165,160,0.4), 0 0 20px rgba(14,165,160,0.25)',
  },
} as const;

export const AGENT_ORDER: AgentName[] = [
  'supervisor',
  'quality_agent',
  'safety_agent',
  'security_agent',
  'test_agent',
  'deployment_agent',
  'integration_agent',
];
