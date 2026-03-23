
import { C } from '../../config/colors';

interface StatItem {
  value: string | number;
  label: string;
  color: string;
}

interface StatGridProps {
  items: StatItem[];
  cols?: number;
}

export function StatGrid({ items, cols = 4 }: StatGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px 14px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: item.color,
              lineHeight: 1.2,
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
