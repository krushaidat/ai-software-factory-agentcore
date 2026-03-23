
import { C } from '../../config/colors';
import { Card, AnimateIn, SevBadge, Badge } from '../../components/shared';
import { FLEET_ROWS } from '../../data/outputs';
import { useMode } from '../../hooks/useMode';

export function FleetTab() {
  const { mode } = useMode();
  const showSbom = mode !== 'base';

  return (
    <div className="space-y-3">
      {FLEET_ROWS.map((row, i) => (
        <AnimateIn key={row.id} delay={i * 0.05}>
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  style={{
                    color: C.accent,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {row.id}
                </span>
                <SevBadge sev={row.status} />
                {showSbom && row.status === 'deployed' && (
                  <Badge color={C.purple} bg={C.purpleDim} border="rgba(139,92,246,0.3)">
                    SBOM
                  </Badge>
                )}
              </div>
              <span style={{ color: C.muted, fontSize: 12 }}>{row.time}</span>
            </div>
          </Card>
        </AnimateIn>
      ))}
    </div>
  );
}
