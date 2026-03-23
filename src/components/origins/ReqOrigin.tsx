
import { C } from '../../config/colors';
import { useBranding } from '../../hooks/useBranding';
import { Card, Section, AnimateIn, Badge } from '../../components/shared';

export function ReqOrigin() {
  const { t } = useBranding();

  return (
    <Section title="AI Requirements Parsing" icon={'\u{1F4C4}'}>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>
                {t('specDocument')} (247 pages)
              </span>
              <Badge color={C.ok} bg={C.okDim} border="rgba(16,185,129,0.3)">
                parsed
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: '247', l: 'Pages scanned' },
                { v: '84', l: 'Requirements found' },
                { v: '12', l: 'Changes detected' },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    textAlign: 'center',
                    padding: 8,
                    background: C.raised,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              BRAKE-1800 Epic
            </div>
            <div className="space-y-2">
              {[
                { id: 'BRAKE-1847', title: 'Fix CAN timeout handling (two-tier degradation)', type: 'Story', priority: 'critical' },
                { id: 'BRAKE-1848', title: 'Add diagnostic logging for timeout events', type: 'Task', priority: 'warning' },
                { id: 'BRAKE-1849', title: 'Update OEM spec traceability matrix', type: 'Task', priority: 'info' },
              ].map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.id}
                    </span>
                    <span style={{ color: C.text, fontSize: 12 }}>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={C.muted} bg={C.raised} border={C.border}>
                      {item.type}
                    </Badge>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          item.priority === 'critical' ? C.crit :
                          item.priority === 'warning' ? C.warn : C.info,
                        display: 'inline-block',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
