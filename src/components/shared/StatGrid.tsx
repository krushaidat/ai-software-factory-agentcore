
import { useState, useEffect, useRef, useCallback } from 'react';
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

/* ── count-up hook ───────────────────────────────────── */

function useCountUp(target: number, durationMs = 600): number {
  const [current, setCurrent] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const prevTarget = useRef<number | null>(null);

  const animate = useCallback(
    (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    },
    [target, durationMs],
  );

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    startRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, animate]);

  return current;
}

/* ── animated value display ──────────────────────────── */

function AnimatedValue({ value, color }: { value: string | number; color: string }) {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value));
  const numericTarget = isNumeric ? (typeof value === 'number' ? value : parseFloat(value)) : 0;
  const animated = useCountUp(numericTarget);

  const isFloat = typeof value === 'string' && value.includes('.') || typeof value === 'number' && !Number.isInteger(value);
  const displayValue = isNumeric
    ? isFloat
      ? animated.toFixed(1)
      : Math.round(animated).toString()
    : value;

  return (
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color,
        lineHeight: 1.2,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {displayValue}
    </div>
  );
}

/* ── stat grid ───────────────────────────────────────── */

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
          <AnimatedValue value={item.value} color={item.color} />
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
