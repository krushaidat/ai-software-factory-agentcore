/**
 * Design tokens for the Mission Control workspace.
 *
 * Vuexy-inspired palette:
 *  - Surface backgrounds with subtle purple tint
 *  - Brand primary is purple (#8c57ff)
 *  - Agent colors use the Vuexy semantic palette
 */

import type { AgentName } from '../types/agents';

export const tokens = {
  agentColors: {
    supervisor: '#8c57ff',          // brand purple — the orchestrator
    quality_agent: '#16b1ff',       // info blue
    safety_agent: '#ffb400',        // warning amber
    security_agent: '#ff5b9b',      // pink
    test_agent: '#a08cff',          // secondary purple
    deployment_agent: '#56ca00',    // success green
    integration_agent: '#ff9f43',   // orange
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

  // Vuexy cards are matte (not glass-blurred) — keep `glass` keys as a
  // legacy fallback but reduce blur and use solid surfaces.
  glass: {
    bg: 'rgba(49, 45, 75, 0.85)',           // C.surface with slight transparency
    border: 'rgba(255, 255, 255, 0.06)',
    blur: '0px',
  },

  shadows: {
    card: '0 4px 18px rgba(15, 11, 30, 0.4)',
    lift: '0 10px 30px rgba(140, 87, 255, 0.18)',
    glow: '0 0 0 1px rgba(140, 87, 255, 0.5), 0 0 24px rgba(140, 87, 255, 0.3)',
  },

  // Vuexy-style gradients
  gradients: {
    heroPurple: 'linear-gradient(135deg, #8c57ff 0%, #a08cff 100%)',
    heroBlue:   'linear-gradient(135deg, #16b1ff 0%, #67d3ff 100%)',
    heroGreen:  'linear-gradient(135deg, #56ca00 0%, #88e02e 100%)',
    heroAmber:  'linear-gradient(135deg, #ffb400 0%, #ffd352 100%)',
    heroPink:   'linear-gradient(135deg, #ff5b9b 0%, #ff8db9 100%)',
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
