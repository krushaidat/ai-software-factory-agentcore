import { C } from '../config/colors';

export interface Origin {
  id: string;
  icon: string;
  title: string;
  bundle: string;
  aws: string[];
  tagline: string;
  color: string;
}

export const ORIGINS_BASE: Origin[] = [
  { id: 'requirements', icon: '\u{1F4C4}', title: 'AI requirements parsing', bundle: '#6', aws: ['Bedrock', 'S3'], tagline: 'OEM spec \u2192 DOORS \u2192 Jira', color: C.accent },
  { id: 'defect', icon: '\u{1F52C}', title: 'Defect feedback loop', bundle: '#7/#14', aws: ['Bedrock', 'Neptune'], tagline: 'Knowledge graph \u2192 proactive fix', color: C.purple },
  { id: 'plm', icon: '\u{1F504}', title: 'OEM PLM data pipeline', bundle: '#9', aws: ['AppFlow', 'Glue'], tagline: 'PLM delta \u2192 work item sync', color: C.info },
];

export const ORIGIN_TARA: Origin = {
  id: 'tara', icon: '\u{1F6E1}', title: 'TARA threat analysis', bundle: 'New', aws: ['Bedrock', 'SecurityHub'], tagline: 'Threat model \u2192 security requirements', color: C.pink,
};

export function getOrigins(mode: string): Origin[] {
  return mode === 'optB' ? [...ORIGINS_BASE, ORIGIN_TARA] : ORIGINS_BASE;
}
