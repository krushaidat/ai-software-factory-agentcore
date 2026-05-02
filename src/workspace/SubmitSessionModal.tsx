/**
 * Modal that pops when the user clicks "+ New session".
 *
 * Shows the 11 Autoware corpus files (from MANIFEST.json snapshot, hardcoded
 * here so the modal can run without a fetch). Picking a file starts a scripted
 * playback against one of our pre-built sessions, mapping the corpus filename
 * to the closest matching session.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../config/colors';
import { Icon } from '../design/icons';

interface CorpusFile {
  filename: string;
  module: 'control' | 'sensing' | 'planning' | 'system' | 'vehicle';
  asil: 'D' | 'C' | 'B' | 'A' | 'QM';
  loc: number;
  description: string;
  /** Which scripted session to play when the user picks this file. */
  mapsToSessionId: string;
}

// Pulled from backend/demo_corpus/autoware/MANIFEST.json (snapshot).
const CORPUS: CorpusFile[] = [
  { filename: 'autonomous_emergency_braking.cpp', module: 'control', asil: 'D', loc: 1134,
    description: 'AEB decision and control logic', mapsToSessionId: 'pr-1847' },
  { filename: 'pid_longitudinal_controller.cpp', module: 'control', asil: 'C', loc: 1389,
    description: 'PID-based longitudinal vehicle controller', mapsToSessionId: 'pr-1840' },
  { filename: 'mpc_lateral_controller.cpp', module: 'control', asil: 'C', loc: 712,
    description: 'Model Predictive Control lateral controller (steering)', mapsToSessionId: 'pr-1840' },
  { filename: 'raw_vehicle_cmd_converter.cpp', module: 'vehicle', asil: 'C', loc: 411,
    description: 'High-level commands → actuator signals', mapsToSessionId: 'pr-1840' },
  { filename: 'imu_corrector.cpp', module: 'sensing', asil: 'B', loc: 308,
    description: 'IMU calibration & bias compensation', mapsToSessionId: 'pr-1845' },
  { filename: 'image_diagnostics.cpp', module: 'sensing', asil: 'B', loc: 405,
    description: 'Camera failure / exposure / blockage detection', mapsToSessionId: 'pr-1845' },
  { filename: 'calibration_status_classifier.cpp', module: 'sensing', asil: 'B', loc: 521,
    description: 'Sensor calibration validity classifier', mapsToSessionId: 'pr-1845' },
  { filename: 'radar_scan_to_pointcloud2.cpp', module: 'sensing', asil: 'A', loc: 192,
    description: 'Radar scan → ROS PointCloud2 message converter', mapsToSessionId: 'pr-1845' },
  { filename: 'mission_planner.cpp', module: 'planning', asil: 'B', loc: 906,
    description: 'High-level mission planner & route generation', mapsToSessionId: 'pr-1845' },
  { filename: 'external_velocity_limit_selector.cpp', module: 'planning', asil: 'C', loc: 296,
    description: 'V2X / operator velocity limits', mapsToSessionId: 'pr-1840' },
  { filename: 'bluetooth_monitor.cpp', module: 'system', asil: 'QM', loc: 188,
    description: 'Bluetooth health diagnostics', mapsToSessionId: 'pr-1840' },
];

const ASIL_COLOR: Record<CorpusFile['asil'], string> = {
  D: C.crit, C: C.warn, B: C.info, A: C.ok, QM: C.dim,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (sessionId: string, filename: string) => void;
}

export function SubmitSessionModal({ open, onClose, onPick }: Props) {
  const [picked, setPicked] = useState<string>(CORPUS[0].filename);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setPicked(CORPUS[0].filename);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = () => {
    const file = CORPUS.find((f) => f.filename === picked);
    if (!file) return;
    onPick(file.mapsToSessionId, file.filename);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 8, 22, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              width: 720,
              maxWidth: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="zap" size="md" color={C.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>Start a new agent session</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  Pick an automotive C++ file. The 7-agent supervisor swarm will analyze it.
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: C.dim }}
                aria-label="Close"
              >
                <Icon name="x" size="md" />
              </button>
            </div>

            {/* Corpus list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {CORPUS.map((f) => {
                const isPicked = f.filename === picked;
                return (
                  <button
                    key={f.filename}
                    onClick={() => setPicked(f.filename)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '10px 12px',
                      marginBottom: 4,
                      borderRadius: 8,
                      border: isPicked ? `1px solid ${C.accentBorder}` : '1px solid transparent',
                      background: isPicked ? C.accentDim : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isPicked) e.currentTarget.style.background = C.raised; }}
                    onMouseLeave={(e) => { if (!isPicked) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isPicked ? C.accent : C.dim}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isPicked && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                        {f.filename}
                      </div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                        {f.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 4, background: C.raised }}>
                        {f.module}
                      </span>
                      <span style={{ fontSize: 10, color: ASIL_COLOR[f.asil], fontWeight: 700,
                        padding: '2px 8px', borderRadius: 4,
                        background: `${ASIL_COLOR[f.asil]}22`, border: `1px solid ${ASIL_COLOR[f.asil]}55` }}>
                        ASIL-{f.asil}
                      </span>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                        {f.loc.toLocaleString()} LOC
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: C.muted }}>
                Source: <a href="https://github.com/autowarefoundation/autoware_universe" target="_blank" rel="noopener noreferrer"
                  style={{ color: C.accent, textDecoration: 'none' }}>autowarefoundation/autoware_universe</a> (Apache-2.0)
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${C.border}`,
                    background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(140, 87, 255, 0.3)' }}
                >
                  Run agents on this file →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
