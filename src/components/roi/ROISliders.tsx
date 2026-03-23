
import { C } from '../../config/colors';
import { ROI_SLIDER_CONFIG } from '../../data/roiDefaults';
import type { ROIInputs } from '../../data/roiDefaults';

interface ROISlidersProps {
  values: ROIInputs;
  onChange: (key: keyof ROIInputs, value: number) => void;
}

export function ROISliders({ values, onChange }: ROISlidersProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ROI_SLIDER_CONFIG.map((cfg) => (
        <div key={cfg.key}>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: C.muted, fontSize: 12 }}>{cfg.label}</label>
            <span
              style={{
                color: C.accent,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {values[cfg.key]}
            </span>
          </div>
          <input
            type="range"
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            value={values[cfg.key]}
            onChange={(e) => onChange(cfg.key, Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: C.accent,
              cursor: 'pointer',
            }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ color: C.dim, fontSize: 10 }}>{cfg.min}</span>
            <span style={{ color: C.dim, fontSize: 10 }}>{cfg.max}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
