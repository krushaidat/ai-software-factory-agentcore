
import { C } from '../../config/colors';
import { Badge } from './Badge';

export function NewBadge() {
  return (
    <Badge
      color={C.purple}
      bg={C.purpleDim}
      border="rgba(139,92,246,0.3)"
    >
      new
    </Badge>
  );
}
