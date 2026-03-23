
import { C } from '../../config/colors';
import { Card, Section, AnimateIn, Badge } from '../../components/shared';
import { REMEDIATION_ITEMS } from '../../data/findings';

export function RemediationPanel() {
  return (
    <Section title="AI Remediation" icon={'\u{1F6E0}'}>
      <div className="space-y-4">
        {REMEDIATION_ITEMS.map((item, i) => (
          <AnimateIn key={i} delay={i * 0.08}>
            <Card>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>{item.t}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    color={item.ft === 'Auto-fix PR' ? C.ok : C.warn}
                    bg={item.ft === 'Auto-fix PR' ? C.okDim : C.warnDim}
                    border={item.ft === 'Auto-fix PR' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}
                  >
                    {item.ft}
                  </Badge>
                  <Badge color={C.accent} bg={C.accentDim} border={C.accentBorder}>
                    {item.c} confidence
                  </Badge>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                {item.h}
              </div>
            </Card>
          </AnimateIn>
        ))}
      </div>
    </Section>
  );
}
