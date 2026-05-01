/**
 * Shared helpers for the reasoning trace card components.
 *
 * Keeps formatting + a single source of truth for typography across every
 * card so they line up visually no matter which event type rendered them.
 */

import { tokens } from '../../design/tokens';
import type { AgentName } from '../../types/agents';

export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export function fmtMs(ms?: number): string {
  if (typeof ms !== 'number' || !isFinite(ms)) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour12: false });
  } catch {
    return '';
  }
}

export function fmtFullTime(iso: string): string {
  try {
    const d = new Date(iso);
    const t = d.toLocaleTimeString([], { hour12: false });
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${t}.${ms}`;
  } catch {
    return iso;
  }
}

export function agentColor(name: AgentName): string {
  return tokens.agentColors[name] ?? '#6b7280';
}

export function agentLabel(name: AgentName): string {
  return tokens.agentLabels[name] ?? name;
}

export function truncate(s: unknown, max = 80): string {
  const str = typeof s === 'string' ? s : JSON.stringify(s ?? '');
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return [
    text.slice(0, idx),
    <mark
      key="m"
      style={{
        background: 'rgba(14,165,160,0.35)',
        color: 'inherit',
        padding: '0 2px',
        borderRadius: 3,
      }}
    >
      {text.slice(idx, idx + q.length)}
    </mark>,
    text.slice(idx + q.length),
  ] as unknown as React.ReactNode;
}
