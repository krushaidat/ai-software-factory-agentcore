
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, Badge, SevBadge } from '../../components/shared';

const SWC_ITEMS = [
  {
    name: 'SWC_VehicleDynamics',
    version: 'v4.1.0',
    impact: 'low',
    detail: 'CAN timeout change compatible \u2014 no interface delta (AUTOSAR Adaptive SWC)',
  },
  {
    name: 'SWC_DiagManager',
    version: 'v2.3.1',
    impact: 'medium',
    detail: 'New DiagLog_Write call \u2014 DTC mapping required (AUTOSAR Classic BSW, BRAKE-4521)',
  },
  {
    name: 'SWC_CANStack',
    version: 'v4.2.1',
    impact: 'low',
    detail: 'Timeout threshold constants consumed \u2014 no breaking change (AUTOSAR COM stack)',
  },
];

export function IntegrationPanel() {
  return (
    <Section title="Multi-SWC Integration" icon={'\u{1F517}'}>
      <div className="space-y-4">
        {SWC_ITEMS.map((swc, i) => (
          <AnimateIn key={swc.name} delay={i * 0.08}>
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>{swc.name}</span>
                  <Badge color={C.muted} bg={C.raised} border={C.border}>
                    {swc.version}
                  </Badge>
                </div>
                <SevBadge sev={swc.impact === 'low' ? 'info' : 'warning'} label={`${swc.impact} impact`} />
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{swc.detail}</div>
            </Card>
          </AnimateIn>
        ))}

        <AnimateIn delay={0.3}>
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
            <span style={{ color: C.ok, fontWeight: 600, fontSize: 13 }}>MERGE READY</span>
            <span style={{ color: C.muted, fontSize: 12, marginLeft: 'auto' }}>
              All 3 SWC interfaces compatible
            </span>
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
