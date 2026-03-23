
import { C } from '../../config/colors';
import { useBranding } from '../../hooks/useBranding';
import { Card, Section, AnimateIn, Badge } from '../../components/shared';
import { getBrandProfile } from '../../config/branding';

export function PLMOrigin() {
  const { t, brandId } = useBranding();
  const profile = getBrandProfile(brandId);
  const partNumbers = Object.keys(profile.partNumbers);

  return (
    <Section title="OEM PLM Data Pipeline" icon={'\u{1F504}'}>
      <div className="space-y-4">
        <AnimateIn>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.info, fontWeight: 600, fontSize: 13 }}>
                {t('plmBomTitle')}
              </span>
              <Badge color={C.info} bg={C.infoDim} border="rgba(59,130,246,0.3)">
                delta sync
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              {t('plmSystem')} BOM revision detected 3 part-number changes affecting
              brake ECU firmware scope. Auto-syncing to work item backlog.
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <div className="space-y-2">
            {partNumbers.map((pn, i) => {
              const labels = ['Firmware binary update', 'Diagnostic module revision', 'VDC calibration table'];
              const statuses = ['changed', 'changed', 'new'] as const;
              const statusColors = { changed: { c: C.warn, bg: C.warnDim, b: 'rgba(245,158,11,0.3)' }, new: { c: C.ok, bg: C.okDim, b: 'rgba(16,185,129,0.3)' } };
              const st = statuses[i] ?? 'changed';
              const sc = statusColors[st];
              return (
                <div
                  key={pn}
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
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.info, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {profile.partNumbers[pn]}
                    </span>
                    <span style={{ color: C.text, fontSize: 12 }}>{labels[i]}</span>
                  </div>
                  <Badge color={sc.c} bg={sc.bg} border={sc.b}>
                    {st}
                  </Badge>
                </div>
              );
            })}
          </div>
        </AnimateIn>
      </div>
    </Section>
  );
}
