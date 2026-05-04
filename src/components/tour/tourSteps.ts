/**
 * Guided tour steps for the Mission Control workspace (Vuexy layout).
 *
 * Each step targets a CSS selector via `data-tour="<id>"` attribute. The
 * TourOverlay finds the element, draws a spotlight, and shows a card with
 * the description. Optional `navigateTo` is a search-string fragment (e.g.
 * `?view=overview&session=pr-1847`) that the tour applies before measuring
 * the next target.
 */

export interface TourStep {
  target: string;
  title: string;
  description: string;
  /** Optional URL search fragment to apply before this step renders. */
  navigateTo?: string;
}

export const TOUR_STEPS: TourStep[] = [
  // 1 — Welcome
  {
    target: 'body',
    title: 'Welcome to the AI Software Factory',
    description:
      'A multi-agent CI/CD pipeline for automotive embedded software, built on Amazon Bedrock AgentCore. The next 90 seconds will show you how 7 specialist agents collaborate to analyze a real Autoware C++ file.',
    navigateTo: '?view=overview&session=pr-1847',
  },

  // 2 — Top bar / data mode
  {
    target: '[data-tour="data-mode-badge"]',
    title: 'Demo data vs. Live AgentCore',
    description:
      'This badge tells you what\'s real: amber "Demo data" means scripted events from a fixture; green "Live AgentCore" means events streaming from real Bedrock AgentCore Runtimes. Switching is one env-var flip on the backend.',
  },

  // 3 — Sidebar nav
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Mission control sidebar',
    description:
      'Grouped navigation: DASHBOARDS for the headline KPIs, AGENTS for live introspection (network, reasoning, memory, code interpreter), OPS for compliance reports.',
  },

  // 4 — Sessions
  {
    target: '[data-tour="sessions-list"]',
    title: 'Three pre-loaded sessions',
    description:
      'Click any of these to switch the entire workspace to that session\'s events. PR #1847 (brake AEB), PR #1845 (IMU calibration), and PR #1840 (MPC tuning) each load their own findings, agent traces, memory entries and reports.',
  },

  // 5 — New session
  {
    target: '[data-tour="new-session"]',
    title: 'Start a fresh agent run',
    description:
      'This opens a corpus picker — 11 real Autoware C++ files (Apache-2.0). Pick one and the 7-agent supervisor swarm runs against it, with events streaming back in real time.',
  },

  // 6 — Hero card on Overview
  {
    target: '[data-tour="hero-card"]',
    title: 'Pipeline analytics hero',
    description:
      'The active session\'s headline KPIs — pass rate, findings auto-fixed, average run time, ASIL coverage. These numbers change when you click a different session.',
    navigateTo: '?view=overview&session=pr-1847',
  },

  // 7 — Stat grid
  {
    target: '[data-tour="stat-grid"]',
    title: 'Tokens, runs, time, savings',
    description:
      'Token usage, active runs, average pipeline duration, and dollars saved vs. manual review — all derived from the actual events of the active session.',
  },

  // 8 — Compliance ring
  {
    target: '[data-tour="compliance-ring"]',
    title: 'Compliance status ring',
    description:
      'Auto-fixed findings as a percentage of total. Critical / Warning / Advisory / Auto-fixed are derived from the agents\' findings.',
  },

  // 9 — Agent network
  {
    target: '[data-tour="sidebar-agent-network"]',
    title: 'Force-directed agent network',
    description:
      'Watch the supervisor and 6 specialists exchange A2A messages in real time as the pipeline runs. Drag nodes; click any agent to see its tools, memory namespace, and recent activity.',
    navigateTo: '?view=agents&session=pr-1847&play=1',
  },

  // 10 — Reasoning trace
  {
    target: '[data-tour="sidebar-reasoning"]',
    title: 'Live reasoning trace',
    description:
      'Every agent invocation, tool call, memory lookup, and code execution as a collapsible tree. Click a span to drill in. This is the AgentCore Observability output, surfaced visually.',
    navigateTo: '?view=reasoning&session=pr-1847',
  },

  // 11 — Memory replay
  {
    target: '[data-tour="sidebar-memory"]',
    title: 'Cross-session memory',
    description:
      'AgentCore Memory has four strategies: SHORT_TERM, USER_PREFERENCE, SEMANTIC, SUMMARY. The timeline shows confidence growing across past sessions; the entries below show what agents have learned.',
    navigateTo: '?view=memory&session=pr-1847',
  },

  // 12 — Code interpreter
  {
    target: '[data-tour="sidebar-code"]',
    title: 'Code Interpreter sandbox',
    description:
      'Agents write and run Python in an AgentCore Code Interpreter sandbox — real MISRA scans, cyclomatic complexity, SAST. This is what gives the findings teeth.',
    navigateTo: '?view=code_interpreter&session=pr-1847',
  },

  // 13 — Copilot
  {
    target: '[data-tour="copilot-button"]',
    title: 'AI Copilot — live Bedrock',
    description:
      'Open the slide-in copilot to ask questions about the pipeline, agents, findings, or compliance evidence. Powered by Claude Sonnet 4.5 with full context of the active session.',
    navigateTo: '?view=overview&session=pr-1847',
  },

  // 14 — Wrap up
  {
    target: 'body',
    title: 'That\'s the tour',
    description:
      'Reach out to Storm Reply if you want this in production. Press Cmd+K any time to navigate, or click the tour button in the top bar to take this again.',
  },
];
