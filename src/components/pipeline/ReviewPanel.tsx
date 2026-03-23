import { useState } from 'react';
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { Card, Section, AnimateIn, SevBadge, AsilBadge, Badge, CodeBlock } from '../../components/shared';
import { getFindings } from '../../data/findings';

export function ReviewPanel() {
  const { mode } = useMode();
  const findings = getFindings(mode);
  const [expanded, setExpanded] = useState<number | null>(null);

  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.sev] = (acc[f.sev] || 0) + 1;
    return acc;
  }, {});

  return (
    <Section title="AI Code Review" icon={'\u{1F50D}'}>
      <div className="space-y-4">
        <AnimateIn>
          <div className="flex items-center gap-3 mb-4">
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
              {findings.length} findings
            </span>
            {Object.entries(sevCounts).map(([sev, count]) => (
              <span key={sev} className="flex items-center gap-1">
                <SevBadge sev={sev} label={`${count} ${sev}`} />
              </span>
            ))}
          </div>
        </AnimateIn>

        {findings.map((f, i) => (
          <AnimateIn key={i} delay={i * 0.06}>
            <Card
              style={{
                cursor: f.fix ? 'pointer' : 'default',
                borderColor: expanded === i ? C.borderHi : C.border,
              }}
            >
              <div
                onClick={() => f.fix && setExpanded(expanded === i ? null : i)}
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SevBadge sev={f.sev} />
                    <span
                      style={{
                        color: C.accent,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {f.rule}
                    </span>
                    {f.asil && mode !== 'base' && <AsilBadge level={f.asil} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {f.auto && (
                      <Badge color={C.ok} bg={C.okDim} border="rgba(16,185,129,0.3)">
                        auto-fix
                      </Badge>
                    )}
                    {f.fix && (
                      <span style={{ color: C.dim, fontSize: 12 }}>
                        {expanded === i ? '\u25B2' : '\u25BC'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{f.msg}</div>
              </div>

              {expanded === i && f.fix && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Suggested fix
                  </div>
                  <CodeBlock>{f.fix}</CodeBlock>
                </div>
              )}
            </Card>
          </AnimateIn>
        ))}
      </div>
    </Section>
  );
}
