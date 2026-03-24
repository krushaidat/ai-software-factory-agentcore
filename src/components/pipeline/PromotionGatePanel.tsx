import { Fragment } from 'react';

import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { Card, Section, AnimateIn, SevBadge, AsilBadge } from '../../components/shared';
import {
  PROMOTION_PATH,
  getGateCriteria,
  PROMOTION_RECOMMENDATION,
  ASIL_APPROVAL,
} from '../../data/promotionGate';

const stageColors: Record<string, { bg: string; border: string; text: string }> = {
  passed: { bg: C.okDim, border: 'rgba(16,185,129,0.3)', text: C.ok },
  current: { bg: C.accentDim, border: C.accentBorder, text: C.accent },
  blocked: { bg: C.warnDim, border: 'rgba(245,158,11,0.3)', text: C.warn },
  future: { bg: C.surface, border: C.border, text: C.dim },
};

export function PromotionGatePanel({ data }: { data?: any }) {
  const { mode } = useMode();
  const criteria = data?.criteria ?? getGateCriteria(mode);

  return (
    <Section title="Promotion Gate" icon={'\u{1F6A6}'}>
      <div className="space-y-4">
        {/* Promotion Path */}
        <AnimateIn>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
              Promotion Path
            </div>
            <div className="flex items-center justify-between">
              {PROMOTION_PATH.map((stage, i) => {
                const sc = stageColors[stage.status] ?? stageColors.future;
                return (
                  <Fragment key={stage.name}>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px 6px',
                        background: sc.bg,
                        border: `1px solid ${sc.border}`,
                        borderRadius: 8,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: sc.text }}>
                        {stage.status === 'passed' && <span style={{ marginRight: 4 }}>&#10003;</span>}
                        {stage.status === 'blocked' && <span style={{ marginRight: 4 }}>{'\u26A0'}</span>}
                        {stage.name}
                      </div>
                      <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                        {stage.status}
                      </div>
                    </div>
                    {i < PROMOTION_PATH.length - 1 && (
                      <div style={{ color: C.dim, fontSize: 16, padding: '0 4px', flexShrink: 0 }}>{'\u2192'}</div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </Card>
        </AnimateIn>

        {/* Decision Matrix */}
        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Decision Matrix
            </div>
            <div className="space-y-2">
              {criteria.map((gc: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 80 }}>
                        {gc.source}
                      </span>
                      <span style={{ color: C.text, fontSize: 12 }}>{gc.criterion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SevBadge sev={gc.verdict} />
                      {gc.confidence !== '\u2014' && (
                        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                          {gc.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, paddingLeft: 80 }}>{gc.detail}</div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        {/* ASIL-aware approval (non-base) */}
        {mode !== 'base' && (
          <AnimateIn delay={0.2}>
            <Card style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AsilBadge level={ASIL_APPROVAL.level.replace('ASIL-', '')} />
                <span style={{ color: C.warn, fontWeight: 600, fontSize: 13 }}>
                  Human Sign-off Required
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 8 }}>
                {ASIL_APPROVAL.rule}
              </div>
              <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: C.text, fontSize: 12 }}>{ASIL_APPROVAL.approver}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SevBadge sev="pending" />
                  <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {ASIL_APPROVAL.signatureRef}
                  </span>
                </div>
              </div>
            </Card>
          </AnimateIn>
        )}

        {/* Current status: Promoted to Integration */}
        <AnimateIn delay={0.25}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
              Current Status
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: C.okDim,
                border: `1px solid rgba(16,185,129,0.3)`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: C.ok, fontSize: 16 }}>&#10003;</span>
              <span style={{ color: C.ok, fontWeight: 600, fontSize: 13 }}>
                PROMOTED TO {PROMOTION_RECOMMENDATION.approved.toUpperCase()}
              </span>
              <span style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>
                All automated gates passed for this level
              </span>
            </div>
          </div>
        </AnimateIn>

        {/* Next gate: Staging blocked */}
        <AnimateIn delay={0.3}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
              Next Gate
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: C.warnDim,
                border: `1px solid rgba(245,158,11,0.3)`,
                borderRadius: 8,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: C.warn, fontSize: 14 }}>{'\u26A0'}</span>
                <span style={{ color: C.warn, fontWeight: 600, fontSize: 13 }}>
                  {PROMOTION_RECOMMENDATION.blocked.toUpperCase()} BLOCKED
                </span>
              </div>
              <div className="space-y-1">
                {PROMOTION_RECOMMENDATION.blockers.map((b, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.muted, paddingLeft: 8 }}>
                    {'\u2022'} {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
