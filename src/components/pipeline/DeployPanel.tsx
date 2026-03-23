
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, SevBadge } from '../../components/shared';

const DEPLOY_ITEMS = [
  {
    target: 'VEW (Virtual ECU Workbench)',
    status: 'deployed',
    detail: 'VEW-001, VEW-002 \u2014 smoke test passed',
    icon: '\u{1F5A5}',
  },
  {
    target: 'HIL (Hardware-in-the-Loop)',
    status: 'deployed',
    detail: 'HIL-003 \u2014 actuator response validated',
    icon: '\u{1F527}',
  },
  {
    target: 'Integration fleet',
    status: 'pending',
    detail: 'FLEET-T01 \u2014 awaiting OTA approval window',
    icon: '\u{1F4E1}',
  },
];

export function DeployPanel() {
  return (
    <Section title="OTA Deployment" icon={'\u{1F4E1}'}>
      <div className="space-y-4">
        {DEPLOY_ITEMS.map((d, i) => (
          <AnimateIn key={d.target} delay={i * 0.08}>
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>{d.icon}</span>
                  <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{d.target}</span>
                </div>
                <SevBadge sev={d.status} />
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{d.detail}</div>
            </Card>
          </AnimateIn>
        ))}
      </div>
    </Section>
  );
}
