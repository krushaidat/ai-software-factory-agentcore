
import { C } from '../../config/colors';
import { Badge } from './Badge';

interface SectionProps {
  title: string;
  icon?: string;
  isNew?: boolean;
  children: React.ReactNode;
}

export function Section({ title, icon, isNew, children }: SectionProps) {
  return (
    <div
      style={{
        background: C.raised,
        border: `1px solid ${isNew ? 'rgba(139,92,246,0.3)' : C.border}`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>
          {title}
        </span>
        {isNew && (
          <Badge
            color={C.purple}
            bg={C.purpleDim}
            border="rgba(139,92,246,0.3)"
          >
            Option B
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}
