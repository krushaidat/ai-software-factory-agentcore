
import { C } from '../../config/colors';
import { useMode } from '../../hooks/useMode';
import { Card, Section, AnimateIn, StatGrid } from '../../components/shared';

interface BuildStep {
  step: string;
  tool: string;
  status: string;
  dur: string;
}

function getBuildSteps(mode: string): BuildStep[] {
  const base: BuildStep[] = [
    { step: 'Checkout', tool: 'CodeCommit', status: 'pass', dur: '3s' },
    { step: 'Build (arm-gcc 12.3)', tool: 'CodeBuild', status: 'pass', dur: '47s' },
    { step: 'Static analysis (MISRA)', tool: 'Bedrock', status: 'pass', dur: '1m 12s' },
    { step: 'Unit tests (247)', tool: 'CodeBuild', status: 'pass', dur: '38s' },
    { step: 'Coverage check', tool: 'CodeBuild', status: 'pass', dur: '5s' },
    { step: 'Package + sign', tool: 'CodeArtifact', status: 'pass', dur: '12s' },
  ];
  if (mode !== 'base') {
    base.splice(3, 0, { step: 'SBOM generation', tool: 'Inspector', status: 'pass', dur: '8s' });
    base.push({ step: 'Provenance attestation', tool: 'Signer', status: 'pass', dur: '4s' });
  }
  return base;
}

export function CICDPanel() {
  const { mode } = useMode();
  const steps = getBuildSteps(mode);

  return (
    <Section title="Golden Path CI/CD" icon={'\u2699'}>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Build Pipeline
            </div>
            <div className="space-y-1">
              {steps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: i % 2 === 0 ? C.surface : 'transparent',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.ok }}>&#10003;</span>
                    <span style={{ color: C.text }}>{s.step}</span>
                    <span style={{ color: C.muted, fontSize: 10 }}>{s.tool}</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                    {s.dur}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              SBOM Summary
            </div>
            <StatGrid
              cols={3}
              items={[
                { value: 47, label: 'Components', color: C.accent },
                { value: '5 MIT', label: 'License mix', color: C.info },
                { value: '1 Apache', label: 'OSS licenses', color: C.info },
              ]}
            />
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Security Posture
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: '0', l: 'Critical CVEs', c: C.ok },
                { v: '0', l: 'High CVEs', c: C.ok },
                { v: '1', l: 'Medium CVEs', c: C.warn },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    textAlign: 'center',
                    padding: 8,
                    background: C.surface,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>
      </div>
    </Section>
  );
}
