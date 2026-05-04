import { useState, type CSSProperties } from 'react';
import { C } from '../config/colors';
import { Icon, type IconName } from '../design/icons';
import { useAuth } from '../hooks/useAuth';
import { SAMPLE_SESSION_LIST } from '../data/sampleSessions';

interface SidebarProps {
  width: number;
  topOffset: number;
  bottomOffset: number;
  view: string;
  onSetView: (v: string) => void;
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'DASHBOARDS',
    items: [{ id: 'overview', label: 'Overview', icon: 'layoutDashboard' }],
  },
  {
    title: 'AGENTS',
    items: [
      { id: 'pipeline', label: 'Pipeline', icon: 'zap' },
      { id: 'agents', label: 'Agent network', icon: 'network' },
      { id: 'reasoning', label: 'Reasoning trace', icon: 'brainCircuit' },
      { id: 'memory', label: 'Memory', icon: 'database' },
      { id: 'code_interpreter', label: 'Code interpreter', icon: 'terminal' },
    ],
  },
  {
    title: 'OPS',
    items: [{ id: 'reports', label: 'Reports', icon: 'fileText' }],
  },
];

const ACTIVE_GRADIENT = 'linear-gradient(118deg, #8c57ff 0%, #a08cff 100%)';
const ACTIVE_SHADOW = '0 4px 12px rgba(140, 87, 255, 0.4)';
const HOVER_BG = 'rgba(255,255,255,0.04)';

const SECTION_HEADER_STYLE: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '18px 14px 8px',
};

function NavRow({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const baseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 36,
    padding: '0 12px',
    margin: '2px 10px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    textAlign: 'left',
    background: isActive ? ACTIVE_GRADIENT : 'transparent',
    color: isActive ? '#ffffff' : C.text,
    boxShadow: isActive ? ACTIVE_SHADOW : 'none',
    transition: 'background 0.15s, color 0.15s',
    width: 'calc(100% - 20px)',
  };

  // Map view ids to tour data attributes so the guided tour can spotlight them.
  const tourId = ((): string | undefined => {
    switch (item.id) {
      case 'agents': return 'sidebar-agent-network';
      case 'reasoning': return 'sidebar-reasoning';
      case 'memory': return 'sidebar-memory';
      case 'code_interpreter': return 'sidebar-code';
      default: return undefined;
    }
  })();

  return (
    <button
      onClick={onClick}
      data-tour={tourId}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = HOVER_BG;
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon name={item.icon} size="md" color={isActive ? '#ffffff' : C.muted} />
      <span>{item.label}</span>
    </button>
  );
}

function SessionsSection({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: {
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          ...SECTION_HEADER_STYLE,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Icon
          name={collapsed ? 'chevronRight' : 'chevronDown'}
          size="sm"
          color={C.muted}
        />
        APPS &amp; PAGES
      </button>

      {!collapsed && (
        <div data-tour="sessions-list" style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              ...SECTION_HEADER_STYLE,
              fontSize: 9,
              padding: '6px 14px 4px 28px',
              color: C.dim,
            }}
          >
            Sessions
          </div>
          {SAMPLE_SESSION_LIST.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                title={s.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 34,
                  padding: '0 12px 0 28px',
                  margin: '1px 10px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  background: isActive ? ACTIVE_GRADIENT : 'transparent',
                  color: isActive ? '#ffffff' : C.text,
                  boxShadow: isActive ? ACTIVE_SHADOW : 'none',
                  transition: 'background 0.15s',
                  width: 'calc(100% - 20px)',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = HOVER_BG;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon
                  name="fileText"
                  size="sm"
                  color={isActive ? '#ffffff' : C.muted}
                />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={onNewSession}
            data-tour="new-session"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 34,
              margin: '6px 14px 4px',
              border: `1px dashed ${C.accentBorder}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: 'transparent',
              color: C.accent,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.accentDim;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Icon name="plus" size="sm" color={C.accent} />
            New session
          </button>
        </div>
      )}
    </div>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  const displayName = user?.displayName || 'Demo user';
  const email = user?.username || 'demo@bosch.com';
  const initial = (displayName.trim().charAt(0) || 'U').toUpperCase();

  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '14px 14px 16px',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: ACTIVE_GRADIENT,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: ACTIVE_SHADOW,
        }}
      >
        {initial}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: C.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: C.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={email}
        >
          {email}
        </div>
      </div>
      <button
        onClick={() => logout()}
        title="Logout"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          color: C.muted,
          flexShrink: 0,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = HOVER_BG;
          e.currentTarget.style.color = C.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = C.muted;
        }}
      >
        <Icon name="logout" size="md" />
      </button>
    </div>
  );
}

export function Sidebar({
  width,
  topOffset,
  bottomOffset,
  view,
  onSetView,
  activeSessionId,
  onSelectSession,
  onNewSession,
}: SidebarProps) {
  return (
    <aside
      data-tour="sidebar-nav"
      style={{
        position: 'fixed',
        top: topOffset,
        bottom: bottomOffset,
        left: 0,
        width,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 30,
      }}
    >
      {/* Logo + product name */}
      <div
        style={{
          padding: '18px 18px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: ACTIVE_GRADIENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: ACTIVE_SHADOW,
          }}
        >
          <Icon name="zap" size="md" color="#ffffff" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              letterSpacing: '0.01em',
              lineHeight: 1.1,
            }}
          >
            AI Factory
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: C.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 2,
            }}
          >
            Mission Control
          </span>
        </div>
      </div>

      {/* Nav sections */}
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div style={SECTION_HEADER_STYLE}>{section.title}</div>
          {section.items.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              isActive={view === item.id}
              onClick={() => onSetView(item.id)}
            />
          ))}
        </div>
      ))}

      {/* Apps & Pages — Sessions list */}
      <SessionsSection
        activeSessionId={activeSessionId}
        onSelectSession={onSelectSession}
        onNewSession={onNewSession}
      />

      {/* User card pinned at bottom */}
      <UserCard />
    </aside>
  );
}
