
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { Card, Section, AnimateIn, StatGrid, Badge, SevBadge } from '../../components/shared';
import {
  TEST_ENVIRONMENTS,
  REASONING_CHAIN,
  REASONING_CHAIN_OPTB,
  TEST_ASSIGNMENTS,
  SKIPPED_ENVS,
} from '../../data/testEnvs';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { sev: string; label: string }> = {
    available: { sev: 'pass', label: 'available' },
    busy: { sev: 'warning', label: 'busy' },
    maintenance: { sev: 'blocked', label: 'maintenance' },
  };
  const s = map[status] ?? map.available;
  return <SevBadge sev={s.sev} label={s.label} />;
}

export function TestEnvPanel() {
  const { mode } = useMode();

  const envCounts = TEST_ENVIRONMENTS.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const reasoningSteps = mode === 'optB'
    ? [...REASONING_CHAIN.slice(0, 2), REASONING_CHAIN_OPTB, ...REASONING_CHAIN.slice(2)]
    : REASONING_CHAIN;

  return (
    <Section title="Test Environment Selection" icon={'\u{1F5A5}'}>
      <div className="space-y-4">
        <AnimateIn>
          <StatGrid
            cols={4}
            items={[
              { value: envCounts['VEW'] || 0, label: 'VEW', color: C.accent },
              { value: envCounts['HIL'] || 0, label: 'HIL', color: C.info },
              { value: envCounts['SIL'] || 0, label: 'SIL', color: C.purple },
              { value: envCounts['Fleet'] || 0, label: 'Fleet', color: C.warn },
            ]}
          />
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Available Environments
            </div>
            <div className="space-y-2">
              {TEST_ENVIRONMENTS.map((env) => (
                <div
                  key={env.id}
                  style={{
                    padding: '10px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        {env.id}
                      </span>
                      <Badge color={C.muted} bg={C.raised} border={C.border}>
                        {env.type}
                      </Badge>
                      <StatusBadge status={env.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, color: C.dim }}>
                        HW {env.hwRevision} | FW {env.fwVersion} | Queue: {env.queueDepth}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {env.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: C.raised,
                          color: C.muted,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
              Agent Reasoning Chain
            </div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: C.border,
                }}
              />
              {reasoningSteps.map((step, i) => {
                const isOptB = mode === 'optB' && step === REASONING_CHAIN_OPTB;
                return (
                  <div key={i} style={{ position: 'relative', marginBottom: i < reasoningSteps.length - 1 ? 16 : 0 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -20,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: isOptB ? C.purpleDim : C.accentDim,
                        border: `2px solid ${isOptB ? C.purple : C.accent}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        background: isOptB ? C.purpleDim : C.surface,
                        border: `1px solid ${isOptB ? 'rgba(139,92,246,0.3)' : C.border}`,
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: isOptB ? C.purple : C.text, marginBottom: 2 }}>
                        {step.step}
                        {isOptB && (
                          <Badge color={C.purple} bg={C.purpleDim} border="rgba(139,92,246,0.3)">
                            Option B
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{step.conclusion}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.3}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Test Assignments
            </div>
            <div className="space-y-2">
              {TEST_ASSIGNMENTS.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: C.text, fontWeight: 500 }}>{a.testGroup}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      {a.envId}
                    </span>
                    <span style={{ color: C.dim, fontSize: 10 }}>{a.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.35}>
          <Card>
            <div style={{ color: C.dim, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Skipped Environments
            </div>
            <div className="space-y-2">
              {SKIPPED_ENVS.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    fontSize: 12,
                    opacity: 0.6,
                  }}
                >
                  <span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{e.id}</span>
                  <span style={{ color: C.dim }}>{e.reason}</span>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.4}>
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
            <span style={{ color: C.ok, fontWeight: 600, fontSize: 13 }}>ENVIRONMENT ASSIGNED</span>
            <span style={{ color: C.muted, fontSize: 12, marginLeft: 'auto' }}>
              3 environments selected, 3 skipped
            </span>
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
