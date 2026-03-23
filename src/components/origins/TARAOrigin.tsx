
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, Badge, CodeBlock, SevBadge } from '../../components/shared';

const ATTACK_TREE = `Brake ECU Attack Surface
\u251C\u2500\u2500 CAN bus interface
\u2502   \u251C\u2500\u2500 Message injection (CAL 3)
\u2502   \u251C\u2500\u2500 Bus flood / DoS (CAL 4)
\u2502   \u2514\u2500\u2500 Timeout manipulation (CAL 3)
\u251C\u2500\u2500 Diagnostic port (UDS)
\u2502   \u251C\u2500\u2500 Unauthorized session (CAL 2)
\u2502   \u2514\u2500\u2500 Firmware extraction (CAL 3)
\u2514\u2500\u2500 OTA update channel
    \u251C\u2500\u2500 Man-in-the-middle (CAL 4)
    \u2514\u2500\u2500 Rollback attack (CAL 3)`;

const CS_REQUIREMENTS = [
  { id: 'CS-BRAKE-001', text: 'Implement SecOC for all brake-critical CAN messages', sev: 'critical', category: 'Authentication' },
  { id: 'CS-BRAKE-002', text: 'Rate-limit CAN message processing to prevent bus flood exploitation', sev: 'warning', category: 'Availability' },
  { id: 'CS-BRAKE-003', text: 'Validate timeout threshold parameters are within OEM-signed bounds', sev: 'warning', category: 'Integrity' },
];

export function TARAOrigin() {
  return (
    <Section title="TARA Threat Analysis" icon={'\u{1F6E1}'} isNew>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.pink, fontWeight: 600, fontSize: 13 }}>
                TARA Document Update Detected
              </span>
              <Badge color={C.pink} bg={C.pinkDim} border="rgba(236,72,153,0.3)">
                ISO 21434
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Brake system threat model v2.4 updated with new attack vectors.
              AI agent analyzing threat model delta and generating cybersecurity
              requirements for the brake ECU CAN timeout handler.
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.pink, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Asset Identification
            </div>
            <div className="space-y-2">
              {[
                { asset: 'Brake ECU firmware', type: 'Software', impact: 'Safety + Security' },
                { asset: 'CAN bus interface', type: 'Interface', impact: 'Availability' },
                { asset: 'Timeout thresholds', type: 'Configuration', impact: 'Integrity' },
              ].map((a) => (
                <div
                  key={a.asset}
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
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{a.asset}</span>
                    <Badge color={C.muted} bg={C.raised} border={C.border}>
                      {a.type}
                    </Badge>
                  </div>
                  <span style={{ color: C.pink, fontSize: 11, fontWeight: 500 }}>{a.impact}</span>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card>
            <div style={{ color: C.pink, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Attack Tree
            </div>
            <CodeBlock>{ATTACK_TREE}</CodeBlock>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.3}>
          <Card>
            <div style={{ color: C.pink, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Generated Cybersecurity Requirements
            </div>
            <div className="space-y-2">
              {CS_REQUIREMENTS.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '10px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ color: C.pink, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        {req.id}
                      </span>
                      <SevBadge sev={req.sev} />
                    </div>
                    <Badge color={C.muted} bg={C.raised} border={C.border}>
                      {req.category}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{req.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
