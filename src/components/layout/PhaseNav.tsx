import { Fragment } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { getStages } from '../../data/stages';

interface Phase {
  id: string;
  num: string;
  label: string;
  path: string;
}

export function PhaseNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useMode();
  const stageCount = getStages(mode).length;

  const phases: Phase[] = [
    { id: 'origin', num: '\u2460', label: 'Origins', path: '/' },
    { id: 'pipeline', num: '\u2461', label: `Pipeline (${stageCount})`, path: '/pipeline' },
    { id: 'outputs', num: '\u2462', label: 'Reports', path: '/reports' },
  ];

  const activePath = location.pathname;

  return (
    <div className="flex items-center gap-1" style={{ padding: '6px 0' }}>
      {phases.map((phase, i) => {
        const isActive =
          activePath === phase.path ||
          (phase.path === '/' && activePath === '/origins');
        return (
          <Fragment key={phase.id}>
            {i > 0 && (
              <span
                style={{
                  color: C.dim,
                  fontSize: 12,
                  margin: '0 4px',
                }}
              >
                {'\u2192'}
              </span>
            )}
            <button
              onClick={() => navigate(phase.path)}
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                borderRadius: 6,
                border: 'none',
                background: isActive ? C.accentDim : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: isActive ? C.accent : C.dim,
                }}
              >
                {phase.num}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? C.accent : C.muted,
                }}
              >
                {phase.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
