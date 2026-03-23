
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, AsilBadge, Badge } from '../../components/shared';
import { SAFETY_CHAIN, TOOL_CONFIDENCE } from '../../data/findings';

export function SafetyPanel() {
  return (
    <Section title="Safety Assessment" icon={'\u26A0\uFE0F'} isNew>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div style={{ color: C.warn, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
              ISO 26262 Evidence Chain
            </div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: C.border,
                }}
              />
              {SAFETY_CHAIN.map((item, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: i < SAFETY_CHAIN.length - 1 ? 14 : 0 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -20,
                      top: 4,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: C.warnDim,
                      border: `2px solid ${C.warn}`,
                    }}
                  />
                  <div
                    style={{
                      padding: '8px 12px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          {item.level}
                        </span>
                        <span style={{ fontSize: 12, color: C.accent, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.id}
                        </span>
                      </div>
                      <AsilBadge level={item.asil} />
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.15}>
          <Card>
            <div style={{ color: C.warn, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Tool Confidence Level (ISO 26262 Part 8)
            </div>
            <div className="space-y-2">
              {TOOL_CONFIDENCE.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{t.tool}</span>
                    <Badge
                      color={t.tcl === 'TCL1' ? C.ok : C.warn}
                      bg={t.tcl === 'TCL1' ? C.okDim : C.warnDim}
                      border={t.tcl === 'TCL1' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}
                    >
                      {t.tcl}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim }}>{t.rationale}</div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.25}>
          <div
            style={{
              padding: '12px 16px',
              background: C.okDim,
              border: `1px solid rgba(16,185,129,0.3)`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: C.ok, fontSize: 16 }}>&#10003;</span>
            <span style={{ color: C.ok, fontWeight: 600, fontSize: 13 }}>SAFETY GATE PASSED</span>
            <span style={{ color: C.muted, fontSize: 12, marginLeft: 'auto' }}>
              ASIL-B evidence chain complete
            </span>
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
