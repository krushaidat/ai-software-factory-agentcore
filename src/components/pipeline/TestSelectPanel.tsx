
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { Card, Section, AnimateIn, StatGrid, AsilBadge, Badge } from '../../components/shared';

export function TestSelectPanel({ data: _data }: { data?: any }) {
  const { mode } = useMode();

  return (
    <Section title="Test Selection" icon={'\u{1F9EA}'}>
      <div className="space-y-4">
        <AnimateIn>
          <StatGrid
            cols={4}
            items={[
              { value: '1,847', label: 'Total tests', color: C.text },
              { value: 89, label: 'Selected', color: C.accent },
              { value: '95%', label: 'Skipped', color: C.ok },
              { value: '41 min', label: 'Saved', color: C.info },
            ]}
          />
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: C.warn, fontSize: 14 }}>{'\u26A0\uFE0F'}</span>
              <span style={{ color: C.warn, fontWeight: 600, fontSize: 13 }}>Coverage gap detected</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              CAN timeout two-tier degradation path has no existing test coverage.
              AI agent auto-generated 3 tests to cover new branches:
              warning threshold, critical threshold, and safe-state transition.
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge color={C.ok} bg={C.okDim} border="rgba(16,185,129,0.3)">
                3 tests generated
              </Badge>
              <Badge color={C.accent} bg={C.accentDim} border={C.accentBorder}>
                86 existing
              </Badge>
            </div>
          </Card>
        </AnimateIn>

        {mode !== 'base' && (
          <AnimateIn delay={0.2}>
            <Card
              style={{
                borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AsilBadge level="B" />
                <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>
                  ASIL-B Coverage Targets
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { v: '100%', l: 'Statement coverage', c: C.ok },
                  { v: '94%', l: 'Branch coverage', c: C.ok },
                  { v: '100%', l: 'MC/DC coverage', c: C.ok },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      textAlign: 'center',
                      padding: 8,
                      background: C.surface,
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </AnimateIn>
        )}
      </div>
    </Section>
  );
}
