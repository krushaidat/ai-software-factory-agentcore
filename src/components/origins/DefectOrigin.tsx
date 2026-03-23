
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, Badge } from '../../components/shared';

export function DefectOrigin() {
  return (
    <Section title="Defect Feedback Loop" icon={'\u{1F52C}'}>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.purple, fontWeight: 600, fontSize: 13 }}>
                DC-2025-0847 Defect Cluster
              </span>
              <Badge color={C.purple} bg={C.purpleDim} border="rgba(139,92,246,0.3)">
                proactive
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { v: '12', l: 'Related PRs', c: C.purple },
                { v: '6 mo', l: 'Time span', c: C.info },
                { v: '3', l: 'Warranty claims', c: C.warn },
                { v: '847', l: 'Signals analyzed', c: C.accent },
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
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
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
            <div style={{ color: C.purple, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              Root cause analysis
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Knowledge graph identified a recurring pattern across 12 PRs over 6 months:
              CAN timeout handling in brake ECU uses single-threshold fallback without
              diagnostic logging, causing intermittent degraded-mode entries that are
              invisible to OEM telemetry. Warranty claim correlation: 3 cases linked
              to unlogged timeout events in field ECUs.
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: C.purpleDim,
                border: `1px solid rgba(139,92,246,0.3)`,
                borderRadius: 6,
                fontSize: 12,
                color: C.purple,
                fontWeight: 500,
              }}
            >
              Recommendation: Two-tier timeout with diagnostic logging (matches PR #1847 scope)
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
