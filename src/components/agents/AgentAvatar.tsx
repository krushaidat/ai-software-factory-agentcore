/**
 * Small reusable agent identity component — colored circle with the agent's
 * initial, optionally followed by a label. Used by the reasoning trace tree
 * and any chip/pill UI that needs to identify an agent.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { C } from '../../config/colors';
import { tokens } from '../../design/tokens';
import type { AgentName } from '../../types/agents';

type Size = 'sm' | 'md' | 'lg';

interface AgentAvatarProps {
  name: AgentName;
  size?: Size;
  showLabel?: boolean;
  /** Optional inline style overrides for the wrapper. */
  style?: CSSProperties;
}

const SIZE_PX: Record<Size, number> = { sm: 16, md: 22, lg: 28 };
const FONT_PX: Record<Size, number> = { sm: 9, md: 11, lg: 13 };

const ROLE_BLURB: Record<AgentName, string> = {
  supervisor: 'Supervisor — orchestrates the pipeline and routes work to specialists.',
  quality_agent: 'Quality — MISRA, complexity, lint, formatter checks.',
  safety_agent: 'Safety — ISO 26262 / ASIL evidence and hazard checks.',
  security_agent: 'Security — vulnerability scans, CVE lookups, taint analysis.',
  test_agent: 'Test — generates and runs unit / integration tests.',
  deployment_agent: 'Deployment — packaging, artifact promotion, rollout.',
  integration_agent: 'Integration — cross-component checks and merge readiness.',
};

export function AgentAvatar({ name, size = 'md', showLabel, style }: AgentAvatarProps) {
  const [hover, setHover] = useState(false);
  const color = tokens.agentColors[name];
  const label = tokens.agentLabels[name];
  const px = SIZE_PX[size];
  const fontPx = FONT_PX[size];
  const initial = label.charAt(0).toUpperCase();

  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
        ...style,
      }}
    >
      <span
        aria-label={`${label} agent`}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          background: `${color}26`,
          border: `1px solid ${color}`,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontPx,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: `0 0 8px ${color}40`,
        }}
      >
        {initial}
      </span>
      {showLabel && (
        <span
          style={{
            color,
            fontSize: fontPx + 1,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 11,
            color: C.text,
            whiteSpace: 'nowrap',
            maxWidth: 280,
            pointerEvents: 'none',
            boxShadow: tokens.shadows.card,
          }}
        >
          {ROLE_BLURB[name]}
        </span>
      )}
    </span>
  );
}
