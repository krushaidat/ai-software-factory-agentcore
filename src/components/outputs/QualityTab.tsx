
import { C } from '../../config/colors';
import { Card, AnimateIn, SevBadge } from '../../components/shared';
import { QUALITY_ROWS } from '../../data/outputs';

const statusMap: Record<string, string> = {
  Full: 'pass',
  Partial: 'warning',
  Manual: 'info',
  Pending: 'pending',
};

export function QualityTab() {
  return (
    <div className="space-y-3">
      {QUALITY_ROWS.map((row, i) => (
        <AnimateIn key={row.label} delay={i * 0.05}>
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>
                  {row.label}
                </span>
                <SevBadge sev={statusMap[row.status] ?? 'info'} label={row.status} />
              </div>
              <span style={{ color: C.muted, fontSize: 12 }}>{row.detail}</span>
            </div>
          </Card>
        </AnimateIn>
      ))}
    </div>
  );
}
