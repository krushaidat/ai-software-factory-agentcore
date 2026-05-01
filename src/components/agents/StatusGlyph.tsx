import { motion } from 'framer-motion';
import { C } from '../../config/colors';
import type { ReasoningTreeNode } from '../../services/agentcore-events';
import { agentColor } from './agentTraceHelpers';

interface StatusGlyphProps {
  node: ReasoningTreeNode;
  size?: number;
}

/**
 * Renders the leading status indicator for a reasoning node.
 *
 *   running   →  pulsing dot in agent color
 *   completed →  filled checkmark
 *   failed    →  red X
 *   tool_call →  half-filled circle
 *   thinking  →  arrow
 */
export function StatusGlyph({ node, size = 14 }: StatusGlyphProps) {
  const color = agentColor(node.agentName);

  if (node.status === 'failed') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="failed">
        <circle cx={8} cy={8} r={7} fill={C.crit} fillOpacity={0.15} stroke={C.crit} />
        <path d="M5 5 L11 11 M11 5 L5 11" stroke={C.crit} strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }

  if (node.type === 'tool_call' || node.type === 'tool_result') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="tool">
        <circle cx={8} cy={8} r={6} fill="none" stroke={color} strokeWidth={1.5} />
        <path d={`M8 2 A6 6 0 0 1 8 14 Z`} fill={color} fillOpacity={0.7} />
      </svg>
    );
  }

  if (node.type === 'agent_thinking') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="thinking">
        <path d="M3 8 L11 8 M8 5 L11 8 L8 11" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (node.status === 'completed') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="completed">
        <circle cx={8} cy={8} r={7} fill={color} fillOpacity={0.18} stroke={color} />
        <path d="M4.5 8.5 L7 11 L11.5 5.5" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // running — pulsing filled dot
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="running"
    >
      <motion.span
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1, 0.85] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          opacity: 0.35,
        }}
      />
      <span
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </span>
  );
}
