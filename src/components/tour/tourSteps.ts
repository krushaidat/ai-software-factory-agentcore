export interface TourStep {
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  phase: 'origins' | 'pipeline' | 'reports';
  action?: 'click' | 'scroll' | 'navigate';
  navigateTo?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Welcome',
    description:
      'This is the AI Software Factory — an AI-powered CI/CD pipeline for automotive embedded software. It automates code review, testing, compliance, and deployment across 9+ stages.',
    phase: 'origins',
  },
  {
    target: '[data-tour="mode-toggle"]',
    title: 'Mode Selection',
    description:
      'Choose your demo depth: Base (core pipeline), Option A (+ compliance stages), or Option B (+ dedicated safety & cybersecurity stages). Each mode adds additional pipeline stages.',
    phase: 'origins',
  },
  {
    target: '[data-tour="origin-grid"]',
    title: 'Pipeline Origins',
    description:
      'Every pipeline run starts from a trigger: requirements change, defect detection, PLM sync, or threat analysis. Select an origin to see its details before submitting.',
    phase: 'origins',
  },
  {
    target: '[data-tour="pr-card"]',
    title: 'Submit PR',
    description:
      'PR #1847 fixes brake ECU CAN timeout handling. Click Submit to run the 9-stage AI pipeline. The PR details show changed files, branches, and the diff.',
    phase: 'origins',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Pipeline Execution',
    description:
      'Watch the AI analyze code in real-time across 9 stages — from CI/CD build to promotion gate. Each stage shows progress, timing, and AWS services used.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'AI Code Review',
    description:
      'Bedrock Claude found 3 MISRA C violations with auto-fix suggestions at 98% confidence. Click any stage card to see detailed findings and remediation options.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/review',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Test Environment Selection',
    description:
      'The AI agent reasons about which test benches to assign based on capabilities, firmware version, and queue depth. It selects optimal VEW, HIL, and SIL environments.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/testenv',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Promotion Gate',
    description:
      'All stage results are aggregated into a promotion decision with clear blockers identified. The gate checks compliance, test coverage, security, and safety criteria.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/promotion',
  },
  {
    target: '[data-tour="outputs-tabs"]',
    title: 'Reports & Outputs',
    description:
      'Comprehensive output reports: compliance (ASPICE/MISRA), fleet status, Jira updates, knowledge graph, CI metrics, and more. Each tab provides detailed drill-down views.',
    phase: 'reports',
    action: 'navigate',
    navigateTo: '/reports',
  },
  {
    target: '[data-tour="outputs-tabs"]',
    title: 'ROI Calculator',
    description:
      'Prospects plug in their own numbers to see projected savings. Adjust team size, PR volume, and manual review hours to calculate potential time and cost reduction.',
    phase: 'reports',
    action: 'navigate',
    navigateTo: '/reports?tab=roi',
  },
  {
    target: '[data-tour="copilot-button"]',
    title: 'AI Copilot',
    description:
      'Click the chat button to ask the AI anything about the pipeline — powered by live Bedrock Claude streaming. It can explain findings, suggest fixes, and answer technical questions.',
    phase: 'reports',
  },
  {
    target: 'body',
    title: 'Demo Complete',
    description:
      "That's the AI Software Factory. You've seen the full pipeline from origin triggers through 9 AI-powered stages to comprehensive output reports. Questions?",
    phase: 'reports',
  },
];
