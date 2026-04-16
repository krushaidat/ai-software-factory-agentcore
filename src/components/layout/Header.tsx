
import { useNavigate, useLocation } from 'react-router-dom';
import { C } from '../../config/colors';
import { useBranding } from '../../hooks/useBranding';
import { useTour } from '../../hooks/useTour';
import { useAuth } from '../../hooks/useAuth';
import type { BrandId } from '../../config/branding';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { brandId, setBrandId, t } = useBranding();
  const { startTour } = useTour();
  const { user, logout } = useAuth();
  const isOrigins = location.pathname === '/' || location.pathname === '/origins';

  const brands: { id: BrandId; label: string }[] = [
    { id: 'bosch-bmw', label: 'Bosch × BMW' },
    { id: 'generic', label: 'Generic OEM' },
  ];

  return (
    <header
      data-tour="header"
      className="flex items-center justify-between px-6 py-3"
      style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: C.accent,
            display: 'inline-block',
          }}
        />
        <span style={{ color: C.muted, fontSize: 11 }}>
          Storm Reply × AWS · AI software factory
        </span>
        <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>
          {t('headerTitle')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User info & logout */}
        {user && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: C.muted }}>{user.displayName}</span>
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
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = C.accent;
                (e.target as HTMLButtonElement).style.color = C.accent;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = C.border;
                (e.target as HTMLButtonElement).style.color = C.muted;
              }}
            >
              Logout
            </button>
          </div>
        )}

        {/* Guided Tour button */}
        <button
          onClick={startTour}
          style={{
            fontSize: 11,
            padding: '4px 12px',
            borderRadius: 5,
            border: `1px solid ${C.accentBorder}`,
            background: C.accentDim,
            color: C.accent,
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          {'\u25B6'} Guided Tour
        </button>

        {/* Feature 5: Brand toggle */}
        <div
          className="flex"
          style={{
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setBrandId(b.id)}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                border: 'none',
                cursor: 'pointer',
                background: brandId === b.id ? C.accentDim : 'transparent',
                color: brandId === b.id ? C.accent : C.muted,
                borderRight:
                  b.id === brands[0].id
                    ? `1px solid ${C.border}`
                    : 'none',
                transition: 'all 0.15s',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Start over button (only when not on origins) */}
        {!isOrigins && (
          <button
            onClick={() => navigate('/')}
            style={{
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 5,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.muted,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = C.accent;
              (e.target as HTMLButtonElement).style.color = C.accent;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = C.border;
              (e.target as HTMLButtonElement).style.color = C.muted;
            }}
          >
            Start over
          </button>
        )}
      </div>
    </header>
  );
}
