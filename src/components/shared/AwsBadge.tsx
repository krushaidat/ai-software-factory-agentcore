
import { C } from '../../config/colors';

interface AwsBadgeProps {
  children: React.ReactNode;
}

export function AwsBadge({ children }: AwsBadgeProps) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 7px',
        borderRadius: 3,
        background: C.orangeDim,
        color: C.orange,
        border: '1px solid rgba(255,153,0,0.2)',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
