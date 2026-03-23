import { C } from './colors';
import type { ModeId } from '../types';

export interface ModeConfig {
  id: ModeId;
  label: string;
  desc: string;
  color: string;
}

export const MODES: ModeConfig[] = [
  { id: 'base', label: 'Base demo', desc: 'Core pipeline', color: C.accent },
  { id: 'optA', label: 'Option A', desc: '+ compliance annotations', color: C.warn },
  { id: 'optB', label: 'Option B', desc: '+ dedicated stages', color: C.purple },
];
