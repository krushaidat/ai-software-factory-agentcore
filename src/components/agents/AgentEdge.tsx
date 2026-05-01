/**
 * SVG line + animated particle traversing a directed edge between two
 * agent nodes. The static line encodes recency-weighted activity opacity;
 * each `InFlightParticle` is a discrete A2A message animation (~600ms).
 *
 * The particle uses an `<animateMotion>` along an invisible path so the
 * heavy lifting stays inside the SVG renderer and never re-renders React.
 */

import { memo, useEffect, useRef } from 'react';
import { tokens } from '../../design/tokens';
import type { AgentName } from '../../types/agents';

export interface AgentEdgeNodeRef {
  agent: AgentName;
  cx: number;
  cy: number;
  radius: number;
}

interface AgentEdgeProps {
  /** Identifier for keying — `${from}->${to}`. */
  id: string;
  source: AgentEdgeNodeRef;
  target: AgentEdgeNodeRef;
  /** Static line opacity 0..1 — driven by recency-weighted edge activity. */
  activity: number;
  /** Dim when either endpoint is filtered out. */
  visibility: number;
  /** Highlight (e.g. when an endpoint is selected). */
  highlighted: boolean;
}

function endpoints(s: AgentEdgeNodeRef, t: AgentEdgeNodeRef) {
  const dx = t.cx - s.cx;
  const dy = t.cy - s.cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: s.cx + ux * s.radius,
    y1: s.cy + uy * s.radius,
    x2: t.cx - ux * (t.radius + 4),
    y2: t.cy - uy * (t.radius + 4),
    dist,
  };
}

export const AgentEdge = memo(function AgentEdge({
  id,
  source,
  target,
  activity,
  visibility,
  highlighted,
}: AgentEdgeProps) {
  const { x1, y1, x2, y2 } = endpoints(source, target);
  const fromColor = tokens.agentColors[source.agent];
  const toColor = tokens.agentColors[target.agent];
  const baseOpacity = Math.min(0.65, 0.18 + activity * 0.08) * visibility;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={`edge-grad-${id}`} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={fromColor} stopOpacity={highlighted ? 0.95 : 0.6} />
          <stop offset="100%" stopColor={toColor} stopOpacity={highlighted ? 0.95 : 0.6} />
        </linearGradient>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#edge-grad-${id})`}
        strokeWidth={highlighted ? 1.8 : 1}
        opacity={highlighted ? Math.min(1, baseOpacity + 0.3) : baseOpacity}
        strokeLinecap="round"
      />
    </g>
  );
});

/* ────────────────────────────────────────────────────────────────────── */

export interface InFlightParticleProps {
  /** Stable key for animation lifecycle. */
  particleId: string;
  source: AgentEdgeNodeRef;
  target: AgentEdgeNodeRef;
  /** Total flight duration (ms). */
  durationMs?: number;
  onArrive?: () => void;
}

/**
 * A single "message in flight" — small filled circle traveling along the
 * edge with a fading trail. Uses SMIL `<animateMotion>` for buttery 60fps
 * without React re-renders, plus a JS fallback for the arrival callback.
 */
export const InFlightParticle = memo(function InFlightParticle({
  particleId,
  source,
  target,
  durationMs = 600,
  onArrive,
}: InFlightParticleProps) {
  const { x1, y1, x2, y2 } = endpoints(source, target);
  const color = tokens.agentColors[source.agent];
  const arrivedRef = useRef(false);

  useEffect(() => {
    if (arrivedRef.current) return;
    const t = window.setTimeout(() => {
      arrivedRef.current = true;
      onArrive?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onArrive]);

  const dur = `${durationMs}ms`;
  const pathD = `M${x1},${y1} L${x2},${y2}`;

  return (
    <g style={{ pointerEvents: 'none' }} data-particle={particleId}>
      {/* Invisible path the particle follows — referenced by animateMotion. */}
      <path id={`path-${particleId}`} d={pathD} fill="none" stroke="none" />

      {/* Trailing soft glow */}
      <circle r={9} fill={color} opacity={0}>
        <animateMotion dur={dur} repeatCount="1" fill="freeze">
          <mpath href={`#path-${particleId}`} />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.45;0.25;0" dur={dur} repeatCount="1" fill="freeze" />
        <animate attributeName="r" values="6;12;9;6" dur={dur} repeatCount="1" fill="freeze" />
      </circle>

      {/* Bright core */}
      <circle r={3.5} fill={color} stroke="#fff" strokeWidth={0.5} opacity={0.95}>
        <animateMotion dur={dur} repeatCount="1" fill="freeze">
          <mpath href={`#path-${particleId}`} />
        </animateMotion>
        <animate attributeName="opacity" values="1;1;0.85;0" dur={dur} repeatCount="1" fill="freeze" />
      </circle>
    </g>
  );
});

/* ────────────────────────────────────────────────────────────────────── */

interface RippleProps {
  rippleId: string;
  cx: number;
  cy: number;
  color: string;
  /** Total ripple duration. */
  durationMs?: number;
}

/** Receiver-side ripple expanding ring + flash. */
export const Ripple = memo(function Ripple({ rippleId, cx, cy, color, durationMs = 600 }: RippleProps) {
  const dur = `${durationMs}ms`;
  return (
    <g style={{ pointerEvents: 'none' }} data-ripple={rippleId}>
      <circle cx={cx} cy={cy} r={6} fill="none" stroke={color} strokeWidth={2}>
        <animate attributeName="r" from="6" to="34" dur={dur} repeatCount="1" fill="freeze" />
        <animate attributeName="opacity" from="0.9" to="0" dur={dur} repeatCount="1" fill="freeze" />
        <animate attributeName="stroke-width" from="2.5" to="0.4" dur={dur} repeatCount="1" fill="freeze" />
      </circle>
    </g>
  );
});
