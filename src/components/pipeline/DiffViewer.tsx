import { useState } from 'react';
import { C } from '../../config/colors';
import { Card } from '../../components/shared';
import { PR } from '../../data/pr';

export function DiffViewer() {
  const [open, setOpen] = useState(false);

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
            {PR.files.length} files, +{PR.files.reduce((s, f) => s + f.add, 0)} / -{PR.files.reduce((s, f) => s + f.del, 0)}
          </span>
        </div>
        <span style={{ color: C.dim, fontSize: 12 }}>{open ? '\u25B2 Hide' : '\u25BC Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <pre
            style={{
              background: '#000',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              lineHeight: 1.65,
              overflowX: 'auto',
              margin: 0,
            }}
          >
            {PR.diff.map((line, i) => {
              let color: string = C.text;
              let bg: string = 'transparent';
              if (line.t === '+') {
                color = C.ok;
                bg = 'rgba(16,185,129,0.08)';
              } else if (line.t === '-') {
                color = C.crit;
                bg = 'rgba(239,68,68,0.08)';
              }
              return (
                <div key={i} style={{ color, background: bg, padding: '0 4px' }}>
                  <span style={{ color: C.dim, userSelect: 'none', marginRight: 8 }}>
                    {line.t === ' ' ? ' ' : line.t}
                  </span>
                  {line.l}
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </Card>
  );
}
