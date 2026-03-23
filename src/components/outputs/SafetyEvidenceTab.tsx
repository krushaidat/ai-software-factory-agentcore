
import { C } from '../../config/colors';
import { SafetyPanel } from '../pipeline/SafetyPanel';

export function SafetyEvidenceTab() {
  return (
    <div>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        ISO 26262 safety evidence
      </div>
      <SafetyPanel />
    </div>
  );
}
