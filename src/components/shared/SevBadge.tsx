
import { C } from '../../config/colors';
import { Badge } from './Badge';

type SevKey =
  | 'critical'
  | 'warning'
  | 'warn'
  | 'info'
  | 'pass'
  | 'low'
  | 'medium'
  | 'none'
  | 'deployed'
  | 'pending'
  | 'blocked'
  | 'high'
  | 'threat';

const sevColors: Record<SevKey, { color: string; bg: string; border: string }> = {
  critical: { color: C.crit, bg: C.critDim, border: 'rgba(239,68,68,0.3)' },
  high:     { color: C.crit, bg: C.critDim, border: 'rgba(239,68,68,0.3)' },
  blocked:  { color: C.crit, bg: C.critDim, border: 'rgba(239,68,68,0.3)' },
  warning:  { color: C.warn, bg: C.warnDim, border: 'rgba(245,158,11,0.3)' },
  warn:     { color: C.warn, bg: C.warnDim, border: 'rgba(245,158,11,0.3)' },
  medium:   { color: C.warn, bg: C.warnDim, border: 'rgba(245,158,11,0.3)' },
  pending:  { color: C.warn, bg: C.warnDim, border: 'rgba(245,158,11,0.3)' },
  info:     { color: C.info, bg: C.infoDim, border: 'rgba(59,130,246,0.3)' },
  low:      { color: C.info, bg: C.infoDim, border: 'rgba(59,130,246,0.3)' },
  pass:     { color: C.ok,   bg: C.okDim,   border: 'rgba(16,185,129,0.3)' },
  none:     { color: C.ok,   bg: C.okDim,   border: 'rgba(16,185,129,0.3)' },
  deployed: { color: C.ok,   bg: C.okDim,   border: 'rgba(16,185,129,0.3)' },
  threat:   { color: C.pink, bg: C.pinkDim, border: 'rgba(236,72,153,0.3)' },
};

interface SevBadgeProps {
  sev: string;
  label?: string;
}

export function SevBadge({ sev, label }: SevBadgeProps) {
  const key = sev.toLowerCase() as SevKey;
  const colors = sevColors[key] ?? sevColors.info;
  return (
    <Badge color={colors.color} bg={colors.bg} border={colors.border}>
      {label ?? sev}
    </Badge>
  );
}
