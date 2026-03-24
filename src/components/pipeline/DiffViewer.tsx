import { useState, useMemo } from 'react';
import { C } from '../../config/colors';
import { Card } from '../../components/shared';
import { PR } from '../../data/pr';

/* ------------------------------------------------------------------ */
/*  Finding-to-line mapping                                            */
/* ------------------------------------------------------------------ */
interface DiffFinding {
  lineIndex: number;
  rule: string;
  sev: 'critical' | 'warning' | 'info';
  msg: string;
  fix: string | null;
}

const FINDINGS: DiffFinding[] = [
  {
    lineIndex: 6,
    rule: 'MISRA 11.3',
    sev: 'critical',
    msg: 'Implicit enum cast in DiagLog_Write argument',
    fix: '        DiagLog_Write((DiagCode_t)DIAG_CAN_TIMEOUT, elapsed);',
  },
  {
    lineIndex: 5,
    rule: 'Bosch-042',
    sev: 'info',
    msg: 'Missing DOORS traceability for CAN_TIMEOUT_THRESHOLD_MS',
    fix: '    /* REQ: BR-ECU-CAN-007 */\n    if (elapsed > CAN_TIMEOUT_THRESHOLD_MS) {',
  },
];

const SEV_COLORS: Record<string, string> = {
  critical: C.crit,
  warning: C.warn,
  info: C.info,
};

/* ------------------------------------------------------------------ */
/*  Syntax highlighting                                                */
/* ------------------------------------------------------------------ */
function highlightSyntax(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const patterns: Array<{ regex: RegExp; color: string }> = [
    { regex: /^(\/\/.*)/, color: C.dim },
    { regex: /^(\/\*[\s\S]*?\*\/)/, color: C.dim },
    { regex: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/, color: C.ok },
    {
      regex: /^(\b(?:if|else|return|void|static|NULL|uint32_t|int|char|const|struct|enum|typedef|extern|unsigned|signed|volatile)\b)/,
      color: C.purple,
    },
    {
      regex: /^(\b(?:SAFE_STATE_DEGRADED|DIAG_CAN_TIMEOUT|DIAG_FAULT_BUF_OVERFLOW|RB_OK|EVT_BRAKE_DEGRADED)\b)/,
      color: C.orange,
    },
    {
      regex: /^(\b[A-Z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\s*(?=\())/,
      color: C.accent,
    },
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const { regex, color } of patterns) {
      const m = remaining.match(regex);
      if (m) {
        tokens.push(
          <span key={key++} style={{ color }}>
            {m[1]}
          </span>,
        );
        remaining = remaining.slice(m[1].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      /* Consume one character */
      tokens.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/*  Side-by-side view builder                                          */
/* ------------------------------------------------------------------ */
interface SideLine {
  num: number | null;
  content: string;
  type: ' ' | '+' | '-';
}

function buildSideBySide(diff: typeof PR.diff): { left: SideLine[]; right: SideLine[] } {
  const left: SideLine[] = [];
  const right: SideLine[] = [];
  let leftNum = 1;
  let rightNum = 1;

  let i = 0;
  while (i < diff.length) {
    const line = diff[i];
    if (line.t === ' ') {
      left.push({ num: leftNum++, content: line.l, type: ' ' });
      right.push({ num: rightNum++, content: line.l, type: ' ' });
      i++;
    } else if (line.t === '-') {
      /* Collect consecutive removals */
      const removals: typeof diff = [];
      while (i < diff.length && diff[i].t === '-') {
        removals.push(diff[i]);
        i++;
      }
      /* Collect consecutive additions */
      const additions: typeof diff = [];
      while (i < diff.length && diff[i].t === '+') {
        additions.push(diff[i]);
        i++;
      }
      const maxLen = Math.max(removals.length, additions.length);
      for (let j = 0; j < maxLen; j++) {
        left.push(
          j < removals.length
            ? { num: leftNum++, content: removals[j].l, type: '-' }
            : { num: null, content: '', type: ' ' },
        );
        right.push(
          j < additions.length
            ? { num: rightNum++, content: additions[j].l, type: '+' }
            : { num: null, content: '', type: ' ' },
        );
      }
    } else if (line.t === '+') {
      left.push({ num: null, content: '', type: ' ' });
      right.push({ num: rightNum++, content: line.l, type: '+' });
      i++;
    } else {
      i++;
    }
  }

  return { left, right };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function DiffViewer() {
  const [open, setOpen] = useState(false);
  const [sideBySide, setSideBySide] = useState(false);
  const [visibleFixes, setVisibleFixes] = useState<Set<number>>(new Set());
  const [hoveredFinding, setHoveredFinding] = useState<number | null>(null);

  const findingsByLine = useMemo(() => {
    const map = new Map<number, DiffFinding>();
    for (const f of FINDINGS) map.set(f.lineIndex, f);
    return map;
  }, []);

  const sides = useMemo(() => buildSideBySide(PR.diff), []);

  const toggleFix = (lineIdx: number) => {
    setVisibleFixes((prev) => {
      const next = new Set(prev);
      if (next.has(lineIdx)) next.delete(lineIdx);
      else next.add(lineIdx);
      return next;
    });
  };

  /* Common line styles */
  const lineStyle = (type: ' ' | '+' | '-'): React.CSSProperties => {
    let color: string = C.text;
    let bg: string = 'transparent';
    if (type === '+') {
      color = C.ok;
      bg = 'rgba(16,185,129,0.08)';
    } else if (type === '-') {
      color = C.crit;
      bg = 'rgba(239,68,68,0.08)';
    }
    return { color, background: bg, padding: '1px 4px', minHeight: 20, display: 'flex', alignItems: 'center' };
  };

  const gutterStyle: React.CSSProperties = {
    color: C.dim,
    userSelect: 'none',
    width: 36,
    minWidth: 36,
    textAlign: 'right',
    paddingRight: 8,
    borderRight: `1px solid ${C.border}`,
    fontSize: 10,
    lineHeight: '20px',
    flexShrink: 0,
  };

  const renderFindingDot = (lineIdx: number) => {
    const f = findingsByLine.get(lineIdx);
    if (!f) return null;
    return (
      <div
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={() => setHoveredFinding(lineIdx)}
        onMouseLeave={() => setHoveredFinding(null)}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: SEV_COLORS[f.sev] || C.crit,
            marginRight: 4,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        />
        {/* Tooltip */}
        {hoveredFinding === lineIdx && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: -6,
              background: C.raised,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '6px 10px',
              zIndex: 20,
              whiteSpace: 'nowrap',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <span style={{ color: SEV_COLORS[f.sev], fontWeight: 600 }}>{f.rule}</span>
            <span style={{ color: C.muted, marginLeft: 8 }}>{f.msg}</span>
          </div>
        )}
      </div>
    );
  };

  const renderFixButton = (lineIdx: number) => {
    const f = findingsByLine.get(lineIdx);
    if (!f || !f.fix) return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFix(lineIdx);
        }}
        style={{
          background: visibleFixes.has(lineIdx) ? C.accentDim : 'transparent',
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 4,
          color: C.accent,
          fontSize: 9,
          padding: '1px 6px',
          cursor: 'pointer',
          marginLeft: 8,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}
      >
        {visibleFixes.has(lineIdx) ? 'Hide fix' : 'View fix'}
      </button>
    );
  };

  const renderFixOverlay = (lineIdx: number) => {
    if (!visibleFixes.has(lineIdx)) return null;
    const f = findingsByLine.get(lineIdx);
    if (!f || !f.fix) return null;
    return (
      <div
        style={{
          background: 'rgba(16,185,129,0.06)',
          borderLeft: `3px solid ${C.ok}`,
          padding: '4px 8px 4px 40px',
          fontSize: 11.5,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ color: C.dim, fontSize: 9, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          AI suggested fix ({f.rule})
        </div>
        {f.fix.split('\n').map((fixLine, fi) => (
          <div key={fi} style={{ color: C.ok }}>
            {highlightSyntax(fixLine)}
          </div>
        ))}
      </div>
    );
  };

  /* Track line numbers for unified view */
  let leftLine = 0;
  let rightLine = 0;

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>PR Diff</span>
          <span style={{ color: C.dim, fontSize: 12 }}>
            {PR.files.length} files, +{PR.files.reduce((s, f) => s + f.add, 0)} / -
            {PR.files.reduce((s, f) => s + f.del, 0)}
          </span>
          {FINDINGS.length > 0 && (
            <span
              style={{
                background: C.critDim,
                color: C.crit,
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                border: `1px solid rgba(239,68,68,0.3)`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {FINDINGS.length} findings
            </span>
          )}
        </div>
        <span style={{ color: C.dim, fontSize: 12 }}>{open ? '\u25B2 Hide' : '\u25BC Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {/* Toolbar */}
          <div
            className="flex items-center justify-between"
            style={{
              marginBottom: 8,
            }}
          >
            <span style={{ color: C.muted, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              src/can_handler.c
            </span>
            <button
              onClick={() => setSideBySide(!sideBySide)}
              style={{
                background: sideBySide ? C.accentDim : 'transparent',
                border: `1px solid ${C.accentBorder}`,
                borderRadius: 4,
                color: C.accent,
                fontSize: 10,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {sideBySide ? 'Unified' : 'Side-by-side'}
            </button>
          </div>

          {/* ---- Unified diff view ---- */}
          {!sideBySide && (
            <pre
              style={{
                background: '#000',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                lineHeight: '20px',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {PR.diff.map((line, i) => {
                if (line.t !== '+') leftLine++;
                if (line.t !== '-') rightLine++;
                const finding = findingsByLine.get(i);

                return (
                  <div key={i}>
                    <div style={{ ...lineStyle(line.t), display: 'flex' }}>
                      {/* Gutter - left number */}
                      <span style={gutterStyle}>
                        {line.t !== '+' ? leftLine : ''}
                      </span>
                      {/* Gutter - right number */}
                      <span
                        style={{
                          ...gutterStyle,
                          borderRight: 'none',
                          paddingRight: 4,
                          marginRight: 4,
                        }}
                      >
                        {line.t !== '-' ? rightLine : ''}
                      </span>
                      {/* Diff indicator */}
                      <span
                        style={{
                          color: C.dim,
                          userSelect: 'none',
                          width: 14,
                          minWidth: 14,
                          textAlign: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {line.t === ' ' ? ' ' : line.t}
                      </span>
                      {/* Finding dot */}
                      {finding && renderFindingDot(i)}
                      {/* Syntax-highlighted code */}
                      <span style={{ flex: 1 }}>{highlightSyntax(line.l)}</span>
                      {/* Fix button */}
                      {finding && renderFixButton(i)}
                    </div>
                    {renderFixOverlay(i)}
                  </div>
                );
              })}
            </pre>
          )}

          {/* ---- Side-by-side view ---- */}
          {sideBySide && (
            <div
              style={{
                display: 'flex',
                background: '#000',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                overflow: 'auto',
              }}
            >
              {/* Left pane (removals) */}
              <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, minWidth: 0 }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 10,
                    color: C.crit,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Old
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11.5,
                    lineHeight: '20px',
                  }}
                >
                  {sides.left.map((sl, i) => (
                    <div key={i} style={{ ...lineStyle(sl.type), display: 'flex' }}>
                      <span style={gutterStyle}>{sl.num ?? ''}</span>
                      <span style={{ padding: '0 4px', flex: 1 }}>
                        {sl.content ? highlightSyntax(sl.content) : '\u00A0'}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
              {/* Right pane (additions) */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 10,
                    color: C.ok,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  New
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11.5,
                    lineHeight: '20px',
                  }}
                >
                  {sides.right.map((sl, i) => {
                    /* Map side-by-side right line index to original diff index for findings */
                    const origIdx = PR.diff.findIndex(
                      (d) => d.l === sl.content && d.t === sl.type,
                    );
                    const finding = origIdx >= 0 ? findingsByLine.get(origIdx) : undefined;

                    return (
                      <div key={i}>
                        <div style={{ ...lineStyle(sl.type), display: 'flex' }}>
                          <span style={gutterStyle}>{sl.num ?? ''}</span>
                          {finding && renderFindingDot(origIdx)}
                          <span style={{ padding: '0 4px', flex: 1 }}>
                            {sl.content ? highlightSyntax(sl.content) : '\u00A0'}
                          </span>
                          {finding && renderFixButton(origIdx)}
                        </div>
                        {origIdx >= 0 && renderFixOverlay(origIdx)}
                      </div>
                    );
                  })}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
