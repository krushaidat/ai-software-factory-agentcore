
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, Badge, SevBadge, StatGrid } from '../../components/shared';

export function CybersecPanel({ data: _data }: { data?: any }) {
  return (
    <Section title="Cybersecurity Assessment" icon={'\u{1F6E1}'} isNew>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.pink, fontWeight: 600, fontSize: 13 }}>
                Threat Model Evaluation
              </span>
              <Badge color={C.pink} bg={C.pinkDim} border="rgba(236,72,153,0.3)">
                ISO 21434
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Brake ECU threat model v2.4 evaluated against PR #1847 changes.
              CAN_TimeoutHandler modifies security-relevant timeout thresholds.
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <StatGrid
            cols={4}
            items={[
              { value: 8, label: 'Attack vectors', color: C.pink },
              { value: 3, label: 'Mitigated', color: C.ok },
              { value: 4, label: 'Acceptable risk', color: C.warn },
              { value: 1, label: 'Needs action', color: C.crit },
            ]}
          />
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card>
            <div style={{ color: C.pink, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Security Controls
            </div>
            <div className="space-y-2">
              {[
                { check: 'SecOC authentication on brake CAN messages', status: 'pass', detail: 'CMAC-128 configured' },
                { check: 'UDS session authentication', status: 'pass', detail: 'Seed-key + certificate-based' },
                { check: 'CAN bus flood rate-limiting', status: 'warning', detail: 'Not implemented \u2014 recommended for timeout handler' },
              ].map((c, i) => (
                <div
                  key={i}
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
                  <div className="flex items-center gap-2">
                    <SevBadge sev={c.status} />
                    <span style={{ color: C.text, fontSize: 12 }}>{c.check}</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 11 }}>{c.detail}</span>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.25}>
          <Card style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <SevBadge sev="warning" />
              <span style={{ color: C.warn, fontWeight: 600, fontSize: 13 }}>
                Rate-Limiting Recommendation
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              CAN bus flood attack (CAL 4) can exploit timeout handler by overwhelming
              message queue. Recommend adding rate-limiting to CAN_TimeoutHandler
              message processing path. Created BRAKE-4522 for tracking.
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.3}>
          <Card>
            <div style={{ color: C.pink, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Regulatory Compliance
            </div>
            <div className="space-y-2">
              {[
                { reg: 'UN R155', desc: 'Cyber security management system', status: 'pass' },
                { reg: 'UN R156', desc: 'Software update management', status: 'pass' },
                { reg: 'ISO 21434', desc: 'Road vehicle cybersecurity engineering', status: 'warn' },
              ].map((r) => (
                <div
                  key={r.reg}
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
                  <div className="flex items-center gap-2">
                    <span style={{ color: C.pink, fontSize: 12, fontWeight: 600 }}>{r.reg}</span>
                    <span style={{ color: C.text, fontSize: 12 }}>{r.desc}</span>
                  </div>
                  <SevBadge sev={r.status} />
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
