import { Fragment } from 'react';

import { C } from '../../config/colors';
import { Card, AnimateIn, NewBadge, StatGrid } from '../../components/shared';
import { getMetricsRows } from '../../data/outputs';
import { useMode } from '../../hooks/useMode';

export function CIMetricsTab() {
  const { mode } = useMode();
  const rows = getMetricsRows(mode);

  return (
    <div className="space-y-4">
      <AnimateIn>
        <Card>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr' }}
          >
            {/* Header */}
            {['Metric', 'Before', 'After', 'Change'].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.dim,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  paddingBottom: 8,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {h}
              </div>
            ))}

            {/* Rows */}
            {rows.map((row: any) => (
              <Fragment key={row.label}>
                <div className="flex items-center gap-2" style={{ fontSize: 12, color: C.text, paddingTop: 8 }}>
                  {row.label}
                  {row.isNew && <NewBadge />}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: C.crit,
                    paddingTop: 8,
                  }}
                >
                  {row.before}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: C.ok,
                    paddingTop: 8,
                  }}
                >
                  {row.after}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.ok,
                    paddingTop: 8,
                  }}
                >
                  {row.change}
                </div>
              </Fragment>
            ))}
          </div>
        </Card>
      </AnimateIn>

      <AnimateIn delay={0.15}>
        <StatGrid
          cols={3}
          items={[
            { value: '$652', label: 'This PR', color: C.ok },
            { value: '$7.8M/yr', label: 'Annualized', color: C.ok },
            { value: '58%', label: 'DC-0847', color: C.accent },
          ]}
        />
      </AnimateIn>
    </div>
  );
}
