import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { C } from '../config/colors';
import { tokens } from './tokens';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Apply the accent glow shadow instead of the default card shadow. */
  glow?: boolean;
  /** Inline style overrides — merged after the card defaults. */
  style?: CSSProperties;
  /** Inner padding shortcut. Defaults to 16. Set to 0 to disable. */
  padding?: number;
  /** Optional named gradient — renders the card with a vibrant Vuexy gradient. */
  gradient?: keyof typeof tokens.gradients;
}

/**
 * Vuexy-style card primitive. Solid surface with subtle border and shadow.
 * Optional `gradient` prop turns the card into a vibrant hero card.
 */
export function GlassCard({
  children,
  glow,
  style,
  padding = 20,
  gradient,
  ...rest
}: GlassCardProps) {
  const baseBg = gradient ? tokens.gradients[gradient] : C.surface;
  const baseBorder = gradient ? 'rgba(255,255,255,0.12)' : tokens.glass.border;

  return (
    <div
      style={{
        background: baseBg,
        border: `1px solid ${baseBorder}`,
        borderRadius: 10,
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
