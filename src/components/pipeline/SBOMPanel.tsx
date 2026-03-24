
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, StatGrid, Badge, SevBadge } from '../../components/shared';
import { SBOM_DEPS } from '../../data/findings';
import type { SBOMDep } from '../../types';

function DepNode({ dep, depth = 0 }: { dep: SBOMDep; depth?: number }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          paddingLeft: 10 + depth * 20,
          background: depth === 0 ? C.surface : 'transparent',
          borderRadius: 4,
          fontSize: 12,
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: C.dim }}>{depth > 0 ? '\u2514 ' : ''}</span>
          <span style={{ color: C.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            {dep.name}
          </span>
          <span style={{ color: C.dim }}>@{dep.ver}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={C.muted} bg={C.raised} border={C.border}>
            {dep.license}
          </Badge>
          {dep.vulns > 0 && <SevBadge sev="warning" label={`${dep.vulns} CVE`} />}
          {dep.vulns === 0 && <SevBadge sev="pass" label="clean" />}
        </div>
      </div>
      {dep.children?.map((child) => (
        <DepNode key={child.name} dep={child} depth={depth + 1} />
      ))}
    </>
  );
}

const POLICY_RULES = [
  { rule: 'No critical CVEs in production', verdict: 'pass', detail: '0 critical vulnerabilities' },
  { rule: 'No GPL in proprietary components', verdict: 'pass', detail: 'All OSS licenses approved (MIT, Apache 2.0, BSD-3)' },
  { rule: 'All dependencies pinned', verdict: 'pass', detail: 'Lockfile hash verified' },
  { rule: 'Provenance attestation', verdict: 'pass', detail: 'SLSA Level 2 attestation generated' },
  { rule: 'Medium CVE review required', verdict: 'warn', detail: 'conan/can_stack v4.2.1 \u2014 1 medium CVE (non-exploitable in context)' },
];

export function SBOMPanel({ data }: { data?: any }) {
  const deps = data?.deps ?? SBOM_DEPS;
  return (
    <Section title="Supply Chain Compliance" icon={'\u{1F4CB}'} isNew>
      <div className="space-y-4">
        <AnimateIn>
          <StatGrid
            cols={4}
            items={[
              { value: 47, label: 'Components', color: C.accent },
              { value: 0, label: 'Critical CVEs', color: C.ok },
              { value: 1, label: 'Medium CVEs', color: C.warn },
              { value: '100%', label: 'License compliant', color: C.ok },
            ]}
          />
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Dependency Tree
            </div>
            <div className="space-y-1">
              {deps.map((dep: any) => (
                <DepNode key={dep.name} dep={dep} />
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Policy Evaluation
            </div>
            <div className="space-y-2">
              {POLICY_RULES.map((p, i) => (
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
                  }}
                >
                  <div className="flex items-center gap-2">
                    <SevBadge sev={p.verdict} />
                    <span style={{ color: C.text, fontSize: 12 }}>{p.rule}</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 11 }}>{p.detail}</span>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.3}>
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
            <span style={{ color: C.ok, fontWeight: 600, fontSize: 13 }}>SUPPLY CHAIN GATE PASSED</span>
            <span style={{ color: C.muted, fontSize: 12, marginLeft: 'auto' }}>
              47 components, 0 policy violations
            </span>
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
