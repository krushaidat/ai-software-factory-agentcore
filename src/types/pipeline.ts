export type ModeId = 'base' | 'optA' | 'optB';
export type PhaseId = 'origin' | 'pipeline' | 'outputs';

export interface Stage {
  id: string;
  name: string;
  icon: string;
  bundle: string;
  aws: string[];
  desc: string;
  dur: number;
  isNew?: boolean;
}

export interface DiffLine {
  t: ' ' | '+' | '-';
  l: string;
}

export interface PRFile {
  name: string;
  add: number;
  del: number;
}

export interface PRData {
  title: string;
  author: string;
  branch: string;
  target: string;
  files: PRFile[];
  diff: DiffLine[];
}

export interface Finding {
  sev: string;
  rule: string;
  msg: string;
  fix: string | null;
  auto: boolean;
  asil: string | null;
  isThreat?: boolean;
}

export interface RemediationItem {
  t: string;
  h: string;
  ft: string;
  c: string;
}

export interface SBOMDep {
  name: string;
  ver: string;
  license: string;
  vulns: number;
  children?: SBOMDep[];
}

export interface SafetyChainItem {
  level: string;
  id: string;
  text: string;
  asil: string;
}

export interface FleetTarget {
  ok: string[];
  warn: string[];
  blocked: string[];
}

export interface TestEnv {
  id: string;
  type: 'VEW' | 'HIL' | 'SIL' | 'Fleet';
  status: 'available' | 'busy' | 'maintenance';
  capabilities: string[];
  hwRevision: string;
  fwVersion: string;
  queueDepth: number;
  asilCapable: string;
}

export interface ReasoningStep {
  step: string;
  conclusion: string;
  icon: string;
}

export interface TestEnvAssignment {
  testGroup: string;
  envId: string;
  reason: string;
}

export interface PromotionStage {
  name: string;
  status: 'passed' | 'current' | 'blocked' | 'future';
}

export interface GateCriterion {
  source: string;
  criterion: string;
  verdict: 'pass' | 'warn' | 'block' | 'pending';
  confidence: string;
  detail: string;
}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotQA {
  question: string;
  response: string;
  followUps: string[];
}
