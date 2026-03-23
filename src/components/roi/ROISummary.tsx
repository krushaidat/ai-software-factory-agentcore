
import { C } from '../../config/colors';
import { Card } from '../../components/shared';

interface ROISummaryProps {
  weeklyHoursSaved: number;
  annualCostSavings: number;
  roi: number;
}

export function ROISummary({ weeklyHoursSaved, annualCostSavings, roi }: ROISummaryProps) {
  const items = [
    {
      value: `${weeklyHoursSaved}`,
      unit: 'hrs/wk',
      label: 'Weekly hours saved',
    },
    {
      value: `$${(annualCostSavings / 1000).toFixed(0)}K`,
      unit: '/yr',
      label: 'Annual cost savings',
    },
    {
      value: `${roi}%`,
      unit: '',
      label: 'ROI',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: C.ok,
                lineHeight: 1.2,
              }}
            >
              {item.value}
              {item.unit && (
                <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>
                  {item.unit}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                marginTop: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {item.label}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
