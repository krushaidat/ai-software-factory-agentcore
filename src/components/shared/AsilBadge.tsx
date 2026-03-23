
import { C } from '../../config/colors';
import { Badge } from './Badge';

const asilColors: Record<string, { color: string; bg: string; border: string }> = {
  A: { color: C.info, bg: C.infoDim, border: 'rgba(59,130,246,0.3)' },
  B: { color: C.warn, bg: C.warnDim, border: 'rgba(245,158,11,0.3)' },
  C: { color: C.crit, bg: C.critDim, border: 'rgba(239,68,68,0.3)' },
  D: { color: C.crit, bg: C.critDim, border: 'rgba(239,68,68,0.3)' },
};

interface AsilBadgeProps {
  level: string;
}

export function AsilBadge({ level }: AsilBadgeProps) {
  const key = level.toUpperCase();
  const colors = asilColors[key] ?? asilColors.A;
  return (
    <Badge color={colors.color} bg={colors.bg} border={colors.border}>
      ASIL-{key}
    </Badge>
  );
}
