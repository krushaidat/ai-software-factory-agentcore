
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, StatGrid, Badge } from '../../components/shared';
import { FLEET_DATA } from '../../data/fleet';

export function FleetConfigPanel() {
  const t = FLEET_DATA.summary.targets;

  return (
    <Section title="Fleet Configuration" icon={'\u{1F4CA}'}>
      <div className="space-y-4">
        <AnimateIn>
          <StatGrid
            cols={4}
            items={[
              { value: 18, label: 'Total nodes', color: C.text },
              { value: 15, label: 'Compliant', color: C.ok },
              { value: 3, label: 'Drift detected', color: C.warn },
              { value: 5, label: 'Deployment targets', color: C.accent },
            ]}
          />
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Fleet Targets
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 11, color: C.ok, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>
                  Ready
                </span>
                {t.ok.map((id) => (
                  <Badge key={id} color={C.ok} bg={C.okDim} border="rgba(16,185,129,0.3)">
                    {id}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 11, color: C.warn, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>
                  Warning
                </span>
                {t.warn.map((id) => (
                  <Badge key={id} color={C.warn} bg={C.warnDim} border="rgba(245,158,11,0.3)">
                    {id}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 11, color: C.crit, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>
                  Blocked
                </span>
                {t.blocked.map((id) => (
                  <Badge key={id} color={C.crit} bg={C.critDim} border="rgba(239,68,68,0.3)">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
