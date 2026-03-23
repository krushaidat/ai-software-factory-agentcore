
import { C } from '../../config/colors';
import { Card, AnimateIn, SevBadge, NewBadge } from '../../components/shared';
import { getJiraUpdates } from '../../data/outputs';
import { useMode } from '../../hooks/useMode';

const actionSev: Record<string, string> = {
  Closed: 'pass',
  Created: 'info',
  Updated: 'warning',
};

export function JiraTab() {
  const { mode } = useMode();
  const updates = getJiraUpdates(mode);

  return (
    <div className="space-y-3">
      {updates.map((item, i) => {
        const isThreat = item.key.startsWith('BRAKE-452') && item.key !== 'BRAKE-4521';
        return (
          <AnimateIn key={item.key} delay={i * 0.05}>
            <Card
              style={isThreat ? { borderColor: C.pink } : undefined}
            >
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
                    {item.key}
                  </span>
                  <SevBadge
                    sev={actionSev[item.action] ?? 'info'}
                    label={item.action}
                  />
                  {isThreat && <NewBadge />}
                </div>
                <span style={{ color: C.muted, fontSize: 12 }}>{item.detail}</span>
              </div>
            </Card>
          </AnimateIn>
        );
      })}
    </div>
  );
}
