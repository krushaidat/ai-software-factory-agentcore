
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { C } from '../../config/colors';
import { ROI_CATEGORIES } from '../../data/roiDefaults';

export function ROIChart() {
  const data = ROI_CATEGORIES.map((cat) => ({
    name: cat.label,
    Manual: cat.manualHours,
    'AI-Assisted': cat.manualHours * (1 - cat.reduction),
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.border}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: C.dim, fontSize: 11 }}
            axisLine={{ stroke: C.border }}
            tickLine={{ stroke: C.border }}
            label={{
              value: 'Hours per PR',
              position: 'insideBottom',
              offset: -5,
              fill: C.dim,
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: C.dim, fontSize: 11 }}
            axisLine={{ stroke: C.border }}
            tickLine={{ stroke: C.border }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: C.text,
            }}
            formatter={(value) => `${Number(value).toFixed(2)} hrs`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: C.muted }}
          />
          <Bar dataKey="Manual" fill={C.crit} radius={[0, 4, 4, 0]} />
          <Bar dataKey="AI-Assisted" fill={C.ok} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
