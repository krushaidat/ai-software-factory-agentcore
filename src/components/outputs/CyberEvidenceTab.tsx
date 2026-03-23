
import { C } from '../../config/colors';
import { CybersecPanel } from '../pipeline/CybersecPanel';

export function CyberEvidenceTab() {
  return (
    <div>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        ISO 21434 cybersecurity evidence
      </div>
      <CybersecPanel />
    </div>
  );
}
