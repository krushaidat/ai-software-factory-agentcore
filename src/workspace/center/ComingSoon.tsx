import { C } from '../../config/colors';
import { GlassCard } from '../../design/glass';
import { Icon, type IconName } from '../../design/icons';

interface ComingSoonProps {
  feature: string;
  iconName?: IconName;
  description?: string;
}

export function ComingSoon({ feature, iconName = 'sparkles', description }: ComingSoonProps) {
  return (
    <GlassCard
      padding={32}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 320,
        gap: 14,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: C.accentDim,
          border: `1px solid ${C.accentBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={iconName} size="xl" color={C.accent} />
      </div>
      <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>
        Coming soon
      </div>
      <div style={{ color: C.muted, fontSize: 13, maxWidth: 360 }}>
        {feature}
      </div>
      {description && (
        <div style={{ color: C.dim, fontSize: 12, maxWidth: 360 }}>
          {description}
        </div>
      )}
    </GlassCard>
  );
}
