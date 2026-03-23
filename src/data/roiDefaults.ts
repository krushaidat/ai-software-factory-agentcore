export interface ROIInputs {
  prsPerWeek: number;
  avgReviewHours: number;
  teamSize: number;
  hourlyCost: number;
}

export const ROI_DEFAULTS: ROIInputs = {
  prsPerWeek: 25,
  avgReviewHours: 3.5,
  teamSize: 15,
  hourlyCost: 85,
};

export const ROI_SLIDER_CONFIG = [
  { key: 'prsPerWeek' as const, label: 'PRs merged per week', min: 5, max: 100, step: 1 },
  { key: 'avgReviewHours' as const, label: 'Avg manual review time (hours)', min: 0.5, max: 8, step: 0.5 },
  { key: 'teamSize' as const, label: 'Engineering team size', min: 5, max: 50, step: 1 },
  { key: 'hourlyCost' as const, label: 'Average hourly cost ($)', min: 50, max: 200, step: 5 },
];

export const PLATFORM_ANNUAL_COST = 180000;

export interface ROICategory {
  label: string;
  manualHours: number;
  aiTime: string;
  reduction: number;
}

export const ROI_CATEGORIES: ROICategory[] = [
  { label: 'Code review', manualHours: 2.5, aiTime: '45 sec', reduction: 0.97 },
  { label: 'Root cause analysis', manualHours: 3.2, aiTime: '12 sec', reduction: 0.99 },
  { label: 'Test selection', manualHours: 0.78, aiTime: '6 min', reduction: 0.87 },
  { label: 'Fleet config', manualHours: 0.75, aiTime: '4 sec', reduction: 0.99 },
  { label: 'Compliance docs', manualHours: 1.5, aiTime: '8 sec', reduction: 0.99 },
];

export function computeROI(inputs: ROIInputs) {
  const weeklyPRs = inputs.prsPerWeek;
  const totalManualHoursPerPR = ROI_CATEGORIES.reduce((sum, c) => sum + c.manualHours, 0);
  const totalSavedHoursPerPR = ROI_CATEGORIES.reduce((sum, c) => sum + c.manualHours * c.reduction, 0);

  const weeklyHoursSaved = weeklyPRs * totalSavedHoursPerPR;
  const annualHoursSaved = weeklyHoursSaved * 52;
  const annualCostSavings = annualHoursSaved * inputs.hourlyCost;
  const roi = ((annualCostSavings - PLATFORM_ANNUAL_COST) / PLATFORM_ANNUAL_COST) * 100;

  const categories = ROI_CATEGORIES.map(c => ({
    label: c.label,
    beforeHours: c.manualHours,
    afterHours: c.manualHours * (1 - c.reduction),
    savedPerPR: c.manualHours * c.reduction,
    annualSaved: weeklyPRs * 52 * c.manualHours * c.reduction * inputs.hourlyCost,
  }));

  return {
    weeklyHoursSaved: Math.round(weeklyHoursSaved),
    annualHoursSaved: Math.round(annualHoursSaved),
    annualCostSavings: Math.round(annualCostSavings),
    roi: Math.round(roi),
    totalManualHoursPerPR,
    totalSavedHoursPerPR,
    categories,
  };
}
