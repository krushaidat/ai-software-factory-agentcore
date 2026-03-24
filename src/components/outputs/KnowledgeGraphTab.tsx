
import { C } from '../../config/colors';
import { AnimateIn, NewBadge } from '../../components/shared';
import { getGraphUpdates } from '../../data/outputs';
import { useMode } from '../../hooks/useMode';
import { KnowledgeGraphViz } from './KnowledgeGraphViz';

export function KnowledgeGraphTab() {
  const { mode } = useMode();
  const updates = getGraphUpdates(mode);
  const hasTARA = updates.some((e) => e.includes('TARA') || e.includes('CS-'));

  return (
    <div className="space-y-3">
      <AnimateIn>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
            Knowledge Graph
          </span>
          <span style={{ color: C.dim, fontSize: 12 }}>
            {updates.length} relationships
          </span>
          {hasTARA && <NewBadge />}
        </div>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <KnowledgeGraphViz arrowStrings={updates} />
      </AnimateIn>
    </div>
  );
}
