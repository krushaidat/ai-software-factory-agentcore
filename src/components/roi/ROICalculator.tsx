import { useState } from 'react';
import { C } from '../../config/colors';
import { ROI_DEFAULTS, computeROI } from '../../data/roiDefaults';
import type { ROIInputs } from '../../data/roiDefaults';
import { Card, AnimateIn } from '../../components/shared';
import { ROISliders } from './ROISliders';
import { ROISummary } from './ROISummary';
import { ROIChart } from './ROIChart';

export function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({ ...ROI_DEFAULTS });

  const results = computeROI(inputs);

  function handleChange(key: keyof ROIInputs, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <div style={{ color: C.text, fontWeight: 600, fontSize: 16 }}>
        Interactive ROI Calculator
      </div>

      <AnimateIn>
        <Card>
          <ROISliders values={inputs} onChange={handleChange} />
        </Card>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <ROISummary
          weeklyHoursSaved={results.weeklyHoursSaved}
          annualCostSavings={results.annualCostSavings}
          roi={results.roi}
        />
      </AnimateIn>

      <AnimateIn delay={0.2}>
        <Card>
          <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
            Time Comparison by Category
          </div>
          <ROIChart />
        </Card>
      </AnimateIn>

      <div style={{ color: C.dim, fontSize: 11, textAlign: 'center' }}>
        Based on $180K/year platform cost
      </div>
    </div>
  );
}
