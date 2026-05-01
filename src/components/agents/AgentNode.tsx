/**
 * SVG node for the Agent Network force-directed graph.
 *
 * One per AgentName. Drawn as a circular badge with the agent letter inside
 * and the agent label below. Encodes status (idle / active / done / failed)
 * via stroke color, opacity, and badge corner glyphs. Active agents pulse.
 */

import { memo } from 'react';
import { tokens } from '../../design/tokens';
import { C } from '../../config/colors';
import type { AgentName } from '../../types/agents';

export type AgentNodeStatus = 'idle' | 'active' | 'done' | 'failed';

export interface AgentNodeProps {
  agent: AgentName;
  cx: number;
  cy: number;
  /** Base radius — supervisor uses a larger value. */
  radius: number;
  status: AgentNodeStatus;
  /** Recency-weighted activity score (used for subtle ring intensity). */
  activity: number;
  /** Multiplier 0..1 — used to fade filtered-out nodes. */
  visibility: number;
  hovered: boolean;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
}

const LETTERS: Record<AgentName, string> = {
  supervisor: 'SV',
  quality_agent: 'Q',
  safety_agent: 'Sa',
  security_agent: 'Se',
  test_agent: 'T',
  deployment_agent: 'D',
  integration_agent: 'I',
};

function statusColor(status: AgentNodeStatus, base: string): string {
  if (status === 'active') return C.accent;
  if (status === 'done') return C.ok;
  if (status === 'failed') return C.crit;
  return base;
}

export const AgentNode = memo(function AgentNode({
  agent,
  cx,
  cy,
  radius,
  status,
  activity,
  visibility,
  hovered,
  selected,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: AgentNodeProps) {
  const baseColor = tokens.agentColors[agent];
  const stroke = statusColor(status, baseColor);
  const label = tokens.agentLabels[agent];
  const letter = LETTERS[agent];
  const isActive = status === 'active';

  // Active agents get a slightly larger effective radius via the pulsing ring.
  const ringR = radius + (isActive ? 8 : 4);
  const opacity = visibility * (status === 'idle' ? 0.78 : 1);

  return (
    <g
      style={{ cursor: 'grab', opacity, transition: 'opacity 0.25s' }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      data-agent={agent}
    >
      {/* Outer pulse ring for active agent */}
      {isActive && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke={C.accent}
            strokeWidth={1.5}
            opacity={0.35}
          >
            <animate attributeName="r" values={`${ringR};${ringR + 8};${ringR}`} dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0.05;0.55" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={cx}
            cy={cy}
            r={ringR + 6}
            fill="none"
            stroke={C.accent}
            strokeWidth={1}
            opacity={0.18}
          />
        </>
      )}

      {/* Selection halo */}
      {selected && (
        <circle cx={cx} cy={cy} r={radius + 10} fill="none" stroke={baseColor} strokeWidth={2} opacity={0.45} />
      )}

      {/* Soft activity glow scales with recency */}
      {activity > 0.1 && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 2}
          fill={baseColor}
          opacity={Math.min(0.18, activity * 0.06)}
          style={{ filter: 'blur(6px)' }}
          pointerEvents="none"
        />
      )}

      {/* Main badge */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={C.raised}
        stroke={stroke}
        strokeWidth={hovered || selected ? 2.5 : 1.8}
      />

      {/* Inner color disc */}
      <circle cx={cx} cy={cy} r={radius - 6} fill={baseColor} opacity={isActive ? 0.32 : 0.18} />

      {/* Letter badge */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={C.text}
        fontSize={radius > 28 ? 14 : 12}
        fontWeight={700}
        fontFamily="'JetBrains Mono', monospace"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {letter}
      </text>

      {/* Done check / failed X corner badge */}
      {status === 'done' && (
        <g pointerEvents="none">
          <circle cx={cx + radius * 0.7} cy={cy - radius * 0.7} r={6} fill={C.ok} stroke={C.bg} strokeWidth={1.5} />
          <path
            d={`M${cx + radius * 0.7 - 2.5},${cy - radius * 0.7} L${cx + radius * 0.7 - 0.5},${cy - radius * 0.7 + 2} L${cx + radius * 0.7 + 2.8},${cy - radius * 0.7 - 1.8}`}
            stroke={C.bg}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {status === 'failed' && (
        <g pointerEvents="none">
          <circle cx={cx + radius * 0.7} cy={cy - radius * 0.7} r={6} fill={C.crit} stroke={C.bg} strokeWidth={1.5} />
          <path
            d={`M${cx + radius * 0.7 - 2.4},${cy - radius * 0.7 - 2.4} L${cx + radius * 0.7 + 2.4},${cy - radius * 0.7 + 2.4} M${cx + radius * 0.7 + 2.4},${cy - radius * 0.7 - 2.4} L${cx + radius * 0.7 - 2.4},${cy - radius * 0.7 + 2.4}`}
            stroke={C.bg}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Label below */}
      <text
        x={cx}
        y={cy + radius + 14}
        textAnchor="middle"
        fill={C.text}
        fontSize={11}
        fontWeight={600}
        fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>

      {/* "thinking…" caption for active agent */}
      {isActive && (
        <text
          x={cx}
          y={cy + radius + 27}
          textAnchor="middle"
          fill={C.accent}
          fontSize={9}
          fontFamily="'JetBrains Mono', monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          thinking
          <tspan>
            <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" repeatCount="indefinite" />
            …
          </tspan>
        </text>
      )}
    </g>
  );
});
