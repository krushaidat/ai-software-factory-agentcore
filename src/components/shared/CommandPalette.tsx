import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { useBranding } from '../../hooks/useBranding';
import { useTour } from '../../hooks/useTour';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCopilot: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenCopilot,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setMode } = useMode();
  const { setBrandId } = useBranding();
  const { startTour } = useTour();

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const commands: Command[] = [
    {
      id: 'nav-origins',
      label: 'Go to Origins',
      shortcut: '1',
      category: 'Navigation',
      action: () => {
        navigate('/origins');
        onClose();
      },
    },
    {
      id: 'nav-pipeline',
      label: 'Go to Pipeline',
      shortcut: '2',
      category: 'Navigation',
      action: () => {
        navigate('/pipeline');
        onClose();
      },
    },
    {
      id: 'nav-reports',
      label: 'Go to Reports',
      shortcut: '3',
      category: 'Navigation',
      action: () => {
        navigate('/reports');
        onClose();
      },
    },
    {
      id: 'nav-review',
      label: 'Go to Code Review stage',
      category: 'Navigation',
      action: () => {
        navigate('/pipeline/review');
        onClose();
      },
    },
    {
      id: 'nav-roi',
      label: 'Go to ROI Calculator',
      category: 'Navigation',
      action: () => {
        navigate('/reports?tab=roi');
        onClose();
      },
    },
    {
      id: 'open-copilot',
      label: 'Open AI Copilot',
      category: 'Actions',
      action: () => {
        onOpenCopilot();
        onClose();
      },
    },
    {
      id: 'start-tour',
      label: 'Start guided tour',
      category: 'Actions',
      action: () => {
        onClose();
        setTimeout(() => startTour(), 150);
      },
    },
    {
      id: 'mode-base',
      label: 'Switch to Base mode',
      category: 'Mode',
      action: () => {
        setMode('base');
        onClose();
      },
    },
    {
      id: 'mode-opta',
      label: 'Switch to Option A',
      category: 'Mode',
      action: () => {
        setMode('optA');
        onClose();
      },
    },
    {
      id: 'mode-optb',
      label: 'Switch to Option B',
      category: 'Mode',
      action: () => {
        setMode('optB');
        onClose();
      },
    },
    {
      id: 'brand-bosch',
      label: 'Switch to Bosch x BMW',
      category: 'Branding',
      action: () => {
        setBrandId('bosch-bmw');
        onClose();
      },
    },
    {
      id: 'brand-generic',
      label: 'Switch to Generic OEM',
      category: 'Branding',
      action: () => {
        setBrandId('generic');
        onClose();
      },
    },
    {
      id: 'export-report',
      label: 'Export report (coming soon)',
      category: 'Actions',
      action: () => {
        showToast('Export report is coming soon');
        onClose();
      },
    },
  ];

  const filtered = query
    ? commands.filter((c) => fuzzyMatch(query, c.label))
    : commands;

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-cmd-item]');
    const item = items[selectedIndex];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
        if (cmd) cmd.action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onClose],
  );

  // Group filtered commands by category
  const grouped: { category: string; items: Command[] }[] = [];
  for (const cmd of filtered) {
    const existing = grouped.find((g) => g.category === cmd.category);
    if (existing) {
      existing.items.push(cmd);
    } else {
      grouped.push({ category: cmd.category, items: [cmd] });
    }
  }

  // Compute flat index for rendering
  let flatIndex = 0;

  const isMac =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
  const modKey = isMac ? '\u2318' : 'Ctrl';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cmd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 120,
            }}
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                width: 520,
                maxHeight: 440,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.dim}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: C.text,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: C.dim,
                    padding: '2px 6px',
                    background: C.raised,
                    borderRadius: 4,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  ESC
                </span>
              </div>

              {/* Command list */}
              <div
                ref={listRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '6px 0',
                }}
              >
                {grouped.length === 0 && (
                  <div
                    style={{
                      padding: '24px 18px',
                      textAlign: 'center',
                      color: C.dim,
                      fontSize: 13,
                    }}
                  >
                    No commands found
                  </div>
                )}

                {grouped.map((group) => (
                  <div key={group.category}>
                    <div
                      style={{
                        padding: '8px 18px 4px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: C.dim,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {group.category}
                    </div>
                    {group.items.map((cmd) => {
                      const idx = flatIndex++;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          data-cmd-item
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 18px',
                            border: 'none',
                            background: isSelected ? C.raised : 'transparent',
                            color: isSelected ? C.text : C.muted,
                            fontSize: 13,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.1s',
                          }}
                        >
                          <span>{cmd.label}</span>
                          {cmd.shortcut && (
                            <span
                              style={{
                                fontSize: 10,
                                color: C.dim,
                                padding: '1px 5px',
                                background: C.surface,
                                borderRadius: 3,
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              {cmd.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '8px 18px',
                  borderTop: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ fontSize: 10, color: C.dim }}
                >
                  <span>
                    <kbd
                      style={{
                        padding: '1px 4px',
                        background: C.raised,
                        borderRadius: 3,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {'\u2191\u2193'}
                    </kbd>{' '}
                    navigate
                  </span>
                  <span>
                    <kbd
                      style={{
                        padding: '1px 4px',
                        background: C.raised,
                        borderRadius: 3,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {'\u23CE'}
                    </kbd>{' '}
                    select
                  </span>
                </div>
                <span style={{ fontSize: 10, color: C.dim }}>
                  {modKey}+K to toggle
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontSize: 13,
              zIndex: 10001,
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
