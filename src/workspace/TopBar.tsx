import type { CSSProperties } from 'react';
import { C } from '../config/colors';
import { tokens } from '../design/tokens';
import { Icon } from '../design/icons';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';
import { useMode } from '../hooks/useMode';
import { MODES } from '../config/modes';
import type { BrandId } from '../config/branding';

interface TopBarProps {
  /** Today's running cost (in dollars) shown in the top-right meter. */
  todayCost: number;
  /** Cmd+K opener — wired by WorkspaceShell. */
  onOpenCommandPalette: () => void;
  height: number;
}

const SEGMENT_BASE: CSSProperties = {
  fontSize: 11,
  padding: '4px 10px',
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  color: C.muted,
  transition: 'all 0.15s',
};

/** Replaces Header. Branding (left) | Mode + Brand toggles (center) | User + cost + cmdK (right). */
export function TopBar({ todayCost, onOpenCommandPalette, height }: TopBarProps) {
  const { user, logout } = useAuth();
  const { brandId, setBrandId, t } = useBranding();
  const { mode, setMode } = useMode();

  const brands: { id: BrandId; label: string }[] = [
    { id: 'bosch-bmw', label: 'Bosch \u00D7 BMW' },
    { id: 'generic', label: 'Generic OEM' },
  ];

  const isMac =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
  const modKey = isMac ? '\u2318' : 'Ctrl';

  return (
    <header
      data-tour="header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 50,
        background: tokens.glass.bg,
        backdropFilter: `blur(${tokens.glass.blur})`,
        WebkitBackdropFilter: `blur(${tokens.glass.blur})`,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      {/* Left — branding */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 12px ${C.accent}`,
          }}
        />
        <span style={{ color: C.muted, fontSize: 11 }}>
          {'Storm Reply \u00D7 AWS \u00B7 AI Software Factory'}
        </span>
        <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>
          {t('headerTitle')}
        </span>
      </div>

      {/* Center — mode + brand toggles */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <div
          style={{
            display: 'flex',
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {MODES.map((m) => {
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  ...SEGMENT_BASE,
                  background: isActive ? `${m.color}25` : 'transparent',
                  color: isActive ? m.color : C.muted,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {brands.map((b) => {
            const isActive = brandId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBrandId(b.id)}
                style={{
                  ...SEGMENT_BASE,
                  background: isActive ? C.accentDim : 'transparent',
                  color: isActive ? C.accent : C.muted,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — cost, user, logout, cmd-k */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <div
          className="flex items-center"
          style={{
            gap: 6,
            padding: '4px 10px',
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
          }}
          title="Today's running cost"
        >
          <Icon name="dollar" size="sm" color={C.accent} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>
            ${todayCost.toFixed(2)} today
          </span>
        </div>

        {user && (
          <span style={{ fontSize: 11, color: C.muted }}>{user.username}</span>
        )}

        {user && (
          <button
            onClick={logout}
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 5,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.muted,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = C.accent;
              el.style.color = C.accent;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = C.border;
              el.style.color = C.muted;
            }}
          >
            <Icon name="logout" size="sm" />
            Logout
          </button>
        )}

        <button
          onClick={onOpenCommandPalette}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 5,
            border: `1px solid ${C.border}`,
            background: C.raised,
            color: C.muted,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Open command palette"
        >
          <Icon name="command" size="sm" />
          <span>{modKey}+K</span>
        </button>
      </div>
    </header>
  );
}
