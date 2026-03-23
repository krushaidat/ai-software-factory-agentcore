
import { C } from '../../config/colors';
import { Card, AnimateIn } from '../../components/shared';
import { OEM_REPORT_SECTIONS } from '../../data/outputs';
import { useBranding } from '../../hooks/useBranding';

export function OEMReportTab() {
  const { t } = useBranding();

  function brandContent(text: string): string {
    return text
      .replace(/BMW Spec/g, t('specDocument'))
      .replace(/BMW/g, t('oemName'));
  }

  return (
    <div className="space-y-3">
      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
        {t('oemReportTitle')}
      </div>
      {OEM_REPORT_SECTIONS.map((sec, i) => (
        <AnimateIn key={sec.title} delay={i * 0.05}>
          <Card>
            <div style={{ color: C.accent, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              {sec.title}
            </div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
              {brandContent(sec.content)}
            </div>
          </Card>
        </AnimateIn>
      ))}
    </div>
  );
}
