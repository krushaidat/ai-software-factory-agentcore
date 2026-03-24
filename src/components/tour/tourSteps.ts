export interface TourStep {
  target: string;
  title: string;
  description: string;
  phase: 'origins' | 'pipeline' | 'reports';
  action?: 'click' | 'scroll' | 'navigate';
  navigateTo?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Welcome to the AI Software Factory',
    description:
      'Built by Storm Reply on AWS, this platform automates the entire CI/CD pipeline for automotive embedded software — from code review to deployment. Every stage is powered by Amazon Bedrock Claude AI.',
    phase: 'origins',
  },
  {
    target: '[data-tour="mode-toggle"]',
    title: 'Demo Modes',
    description:
      'Three demo configurations: Base (9-stage core pipeline), Option A (+ compliance annotations), or Option B (+ dedicated safety, cybersecurity & SBOM stages — 12 stages total).',
    phase: 'origins',
  },
  {
    target: '[data-tour="origin-grid"]',
    title: 'Pipeline Triggers',
    description:
      'Every pipeline run starts from a trigger: AI requirements parsing from OEM specs, defect feedback from the knowledge graph, PLM data sync, or TARA threat analysis (Option B).',
    phase: 'origins',
  },
  {
    target: '[data-tour="pr-card"]',
    title: 'Submit Code for Analysis',
    description:
      'PR #1847 fixes brake ECU CAN timeout handling. The demo code is pre-loaded — click the submit button to run the full AI pipeline. Each stage calls Bedrock Claude to analyze the code in real-time.',
    phase: 'origins',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Live Pipeline Execution',
    description:
      'Watch the AI analyze code across 9+ stages in real-time. Each stage shows its status, elapsed time, and AWS services used. Hover any stage for details, click to see full results.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'AI Code Review (MISRA C)',
    description:
      'Bedrock Claude performs MISRA C:2012 compliance analysis, finding violations with auto-fix suggestions and confidence scores. Each finding links to the exact code line and rule reference.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/review',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Intelligent Test Environment Selection',
    description:
      'The AI agent reasons step-by-step about which test benches (VEW, HIL, SIL, Fleet) to assign based on capabilities, firmware compatibility, ASIL level, and queue depth.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/testenv',
  },
  {
    target: '[data-tour="pipeline-strip"]',
    title: 'Promotion Gate Decision',
    description:
      'All stage results aggregate into a promotion decision. The gate evaluates compliance, test coverage, security, and safety criteria — showing clear blockers and what\'s needed to proceed.',
    phase: 'pipeline',
    action: 'navigate',
    navigateTo: '/pipeline/promotion',
  },
  {
    target: '[data-tour="outputs-tabs"]',
    title: 'Compliance Reports',
    description:
      'Comprehensive output reports: ASPICE/MISRA compliance, fleet deployment status, OEM delivery reports, Jira ticket updates, and CI metrics with time savings breakdown.',
    phase: 'reports',
    action: 'navigate',
    navigateTo: '/reports',
  },
  {
    target: '[data-tour="outputs-tabs"]',
    title: 'Interactive Knowledge Graph',
    description:
      'A live force-directed graph showing relationships between code entities, PRs, defect clusters, requirements, and safety goals. Drag nodes, click to highlight connections — powered by Amazon Neptune.',
    phase: 'reports',
    action: 'navigate',
    navigateTo: '/reports?tab=graph',
  },
  {
    target: '[data-tour="outputs-tabs"]',
    title: 'ROI Calculator',
    description:
      'Prospects plug in their own numbers — team size, PR volume, hourly cost — to see projected time and cost savings. The before/after chart shows impact per pipeline stage.',
    phase: 'reports',
    action: 'navigate',
    navigateTo: '/reports?tab=roi',
  },
  {
    target: '[data-tour="copilot-button"]',
    title: 'AI Copilot (Live Bedrock)',
    description:
      'Ask the AI anything about the pipeline — "Why did MISRA 11.3 fail?", "What blocks promotion?", "Show the safety evidence chain." Powered by real-time Bedrock Claude streaming with full pipeline context.',
    phase: 'reports',
  },
  {
    target: 'body',
    title: 'Keyboard Shortcuts',
    description:
      'Press Cmd+K (or Ctrl+K) to open the command palette — navigate anywhere, switch modes, open the copilot, or start the tour again. Every view is URL-bookmarkable.',
    phase: 'reports',
  },
  {
    target: 'body',
    title: 'Demo Complete',
    description:
      'That\'s the AI Software Factory — a complete AI-powered CI/CD pipeline for automotive embedded software, built on AWS. The copilot, pipeline analysis, and all stage results are powered by live Amazon Bedrock. Questions?',
    phase: 'reports',
  },
];
