export type BrandId = 'bosch-bmw' | 'generic';

export interface BrandProfile {
  id: BrandId;
  customerName: string;
  oemName: string;
  headerTitle: string;
  headerBranding: string;
  specDocument: string;
  plmSystem: string;
  plmBomTitle: string;
  oemReportTitle: string;
  partNumbers: Record<string, string>;
  engineerNames: Record<string, string>;
}

const profiles: Record<BrandId, BrandProfile> = {
  'bosch-bmw': {
    id: 'bosch-bmw',
    customerName: 'Bosch',
    oemName: 'BMW',
    headerTitle: 'Bosch engineering acceleration \u2014 end to end',
    headerBranding: 'Bosch AI Software Factory',
    specDocument: 'BMW Brake Spec v3.2',
    plmSystem: 'BMW Teamcenter',
    plmBomTitle: 'BMW Teamcenter BOM Rev 47 \u2192 48',
    oemReportTitle: 'OEM delivery report (BMW)',
    partNumbers: {
      '0 265 260 074': '0 265 260 074',
      '0 265 260 075': '0 265 260 075',
      '0 265 260 081': '0 265 260 081',
    },
    engineerNames: {
      author: 'M. Weber',
      reviewer: 'K. Fischer',
    },
  },
  generic: {
    id: 'generic',
    customerName: 'Tier 1 Supplier',
    oemName: 'OEM',
    headerTitle: 'Engineering acceleration \u2014 end to end',
    headerBranding: 'AI Software Factory',
    specDocument: 'OEM Brake Spec v3.2',
    plmSystem: 'OEM PLM System',
    plmBomTitle: 'OEM PLM BOM Rev 47 \u2192 48',
    oemReportTitle: 'OEM delivery report',
    partNumbers: {
      '0 265 260 074': 'ECU-FW-001',
      '0 265 260 075': 'ECU-DM-002',
      '0 265 260 081': 'ECU-VDC-003',
    },
    engineerNames: {
      author: 'Lead Engineer',
      reviewer: 'Senior Reviewer',
    },
  },
};

export function getBrandProfile(id: BrandId): BrandProfile {
  return profiles[id];
}
