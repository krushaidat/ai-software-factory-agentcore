import { Fragment } from 'react';

import { C } from '../../config/colors';
import { NewBadge } from '../../components/shared';
import type { Stage } from '../../types';

interface PipelineStripProps {
  stages: Stage[];
  activeId: string | null;
  completed: string[];
  running: boolean;
  onJump: (stageId: string) => void;
}

export function PipelineStrip({ stages, activeId, completed, running, onJump }: PipelineStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        overflowX: 'auto',
        padding: '8px 0',
      }}
    >
      {stages.map((stage, i) => {
        const isDone = completed.includes(stage.id);
        const isActive = stage.id === activeId;

        let bg: string = C.surface;
        let borderColor: string = C.border;
        let textColor: string = C.dim;
        let iconOpacity = 0.4;

        if (isDone) {
          bg = C.okDim;
          borderColor = 'rgba(16,185,129,0.3)';
          textColor = C.ok;
          iconOpacity = 1;
        } else if (isActive) {
          bg = C.accentDim;
          borderColor = C.accentBorder;
          textColor = C.accent;
          iconOpacity = 1;
        }

        return (
          <Fragment key={stage.id}>
            <button
              onClick={() => onJump(stage.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 10px',
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                cursor: 'pointer',
                minWidth: 80,
                transition: 'all 0.2s',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  opacity: iconOpacity,
                  animation: isActive && running ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                {isDone ? (
                  <span style={{ color: C.ok }}>&#10003;</span>
                ) : (
                  stage.icon
                )}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: textColor,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {stage.name}
              </div>
              {stage.isNew && (
                <div style={{ position: 'absolute', top: -6, right: -6 }}>
                  <NewBadge />
                </div>
              )}
            </button>
            {i < stages.length - 1 && (
              <div
                style={{
                  width: 16,
                  height: 2,
                  background: isDone ? C.ok : C.border,
                  flexShrink: 0,
                }}
              />
            )}
          </Fragment>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
