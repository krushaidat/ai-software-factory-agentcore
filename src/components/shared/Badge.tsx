

interface BadgeProps {
  children: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

export function Badge({ children, color, bg, border }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 8px',
        borderRadius: 4,
        background: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
}
