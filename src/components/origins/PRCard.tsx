
import { C } from '../../config/colors';
import { Card, AnimateIn, Badge } from '../../components/shared';
import { PR } from '../../data/pr';

interface PRCardProps {
  onSubmit: () => void;
  stageCount: number;
}

export function PRCard({ onSubmit, stageCount }: PRCardProps) {
  return (
    <AnimateIn delay={0.15}>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>{PR.title}</span>
          <Badge color={C.info} bg={C.infoDim} border="rgba(59,130,246,0.3)">
            open
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4" style={{ fontSize: 12 }}>
          <div>
            <span style={{ color: C.muted }}>Author: </span>
            <span style={{ color: C.text }}>{PR.author}</span>
          </div>
          <div>
            <span style={{ color: C.muted }}>Branch: </span>
            <span style={{ color: C.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {PR.branch}
            </span>
          </div>
          <div>
            <span style={{ color: C.muted }}>Target: </span>
            <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {PR.target}
            </span>
          </div>
          <div>
            <span style={{ color: C.muted }}>Files: </span>
            <span style={{ color: C.text }}>
              {PR.files.length} changed (+{PR.files.reduce((s, f) => s + f.add, 0)} / -{PR.files.reduce((s, f) => s + f.del, 0)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {PR.files.map((f) => (
            <span
              key={f.name}
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: C.muted,
                padding: '2px 6px',
                background: C.raised,
                borderRadius: 4,
                border: `1px solid ${C.border}`,
              }}
            >
              {f.name}
              <span style={{ color: C.ok, marginLeft: 4 }}>+{f.add}</span>
              <span style={{ color: C.crit, marginLeft: 2 }}>-{f.del}</span>
            </span>
          ))}
        </div>

        <button
          onClick={onSubmit}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 0',
            background: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 8,
            color: C.accent,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Submit PR → run {stageCount}-stage pipeline
        </button>
      </Card>
    </AnimateIn>
  );
}
