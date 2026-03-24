
import { C } from '../../config/colors';
import { AnimateIn, AwsBadge, NewBadge, Badge } from '../../components/shared';
import type { Origin } from '../../data/origins';

interface OriginGridProps {
  origins: Origin[];
  selectedOrigin: string | null;
  onSelect: (id: string) => void;
}

export function OriginGrid({ origins, selectedOrigin, onSelect }: OriginGridProps) {
  return (
    <div data-tour="origin-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {origins.map((o, i) => {
        const isSelected = selectedOrigin === o.id;
        return (
          <AnimateIn key={o.id} delay={i * 0.06}>
            <button
              onClick={() => onSelect(isSelected ? '' : o.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                background: isSelected ? C.raised : C.surface,
                border: `1px solid ${isSelected ? o.color : C.border}`,
                borderRadius: 10,
                padding: 16,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 20 }}>{o.icon}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{o.title}</span>
                {o.id === 'tara' && <NewBadge />}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{o.tagline}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={C.accent} bg={C.accentDim} border={C.accentBorder}>
                  {o.bundle}
                </Badge>
                {o.aws.map((a) => (
                  <AwsBadge key={a}>{a}</AwsBadge>
                ))}
              </div>
            </button>
          </AnimateIn>
        );
      })}
    </div>
  );
}
