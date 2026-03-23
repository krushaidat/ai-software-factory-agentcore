
import { C } from '../../config/colors';
import { SBOMPanel } from '../pipeline/SBOMPanel';

export function SBOMTab() {
  return (
    <div>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        Software bill of materials
      </div>
      <SBOMPanel />
    </div>
  );
}
