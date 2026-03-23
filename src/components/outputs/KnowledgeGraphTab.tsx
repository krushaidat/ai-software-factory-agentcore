
import { C } from '../../config/colors';
import { Card, AnimateIn, NewBadge } from '../../components/shared';
import { getGraphUpdates } from '../../data/outputs';
import { useMode } from '../../hooks/useMode';

export function KnowledgeGraphTab() {
  const { mode } = useMode();
  const updates = getGraphUpdates(mode);

  return (
    <div className="space-y-3">
      {updates.map((entry, i) => {
        const isTARA = entry.includes('TARA') || entry.includes('CS-');
        return (
          <AnimateIn key={i} delay={i * 0.05}>
            <Card style={isTARA ? { borderColor: C.pink } : undefined}>
              <div className="flex items-center gap-3">
                <span
                  style={{
                    color: isTARA ? C.pink : C.text,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {entry}
                </span>
                {isTARA && <NewBadge />}
              </div>
            </Card>
          </AnimateIn>
        );
      })}
    </div>
  );
}
