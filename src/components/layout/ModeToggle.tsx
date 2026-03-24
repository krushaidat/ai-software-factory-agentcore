
import { C } from '../../config/colors';
import { MODES } from '../../config/modes';
import { useMode } from '../../hooks/useMode';

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div
      data-tour="mode-toggle"
      className="flex gap-2"
      style={{ padding: '8px 0' }}
    >
      {MODES.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex flex-col items-start px-4 py-2"
            style={{
              borderRadius: 8,
              border: `1px solid ${isActive ? m.color : C.border}`,
              background: isActive
                ? `${m.color}15`
                : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              minWidth: 140,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isActive ? m.color : C.text,
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 2,
              }}
            >
              {m.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
