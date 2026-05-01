import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { tokens } from './tokens';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Apply the accent glow shadow instead of the default card shadow. */
  glow?: boolean;
  /** Inline style overrides — merged after the glass defaults. */
  style?: CSSProperties;
  /** Inner padding shortcut. Defaults to 16. Set to 0 to disable. */
  padding?: number;
}

/** Glassmorphism card primitive used by every workspace section. */
export function GlassCard({
  children,
  glow,
  style,
  padding = 16,
  ...rest
}: GlassCardProps) {
  return (
    <div
      style={{
        background: tokens.glass.bg,
        border: `1px solid ${tokens.glass.border}`,
        backdropFilter: `blur(${tokens.glass.blur})`,
        WebkitBackdropFilter: `blur(${tokens.glass.blur})`,
        borderRadius: 12,
        boxShadow: glow ? tokens.shadows.glow : tokens.shadows.card,
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
