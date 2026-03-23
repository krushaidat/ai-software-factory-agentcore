import type { Stage, ModeId } from '../types';

export function getStages(mode: ModeId): Stage[] {
  const base: Stage[] = [
    { id: 'cicd', name: 'Golden path CI/CD', icon: '\u2699', bundle: '#1', aws: ['CodePipeline', 'CodeBuild'], desc: 'Build \u2192 scan \u2192 test \u2192 package', dur: 1800 },
    { id: 'review', name: 'AI code review', icon: '\u{1F50D}', bundle: '#2', aws: ['Bedrock', 'Lambda'], desc: 'MISRA, security, quality gate', dur: 2500 },
    { id: 'remediation', name: 'AI remediation', icon: '\u{1F6E0}', bundle: '#3', aws: ['Bedrock', 'Step Functions'], desc: 'Root-cause analysis + auto-fix', dur: 2200 },
    { id: 'testselect', name: 'Test selection', icon: '\u{1F9EA}', bundle: '#7', aws: ['Bedrock', 'Neptune'], desc: 'Knowledge-graph test selection', dur: 2000 },
    { id: 'testenv', name: 'Test env selection', icon: '\u{1F5A5}', bundle: '#7b', aws: ['Bedrock', 'DynamoDB'], desc: 'AI-assigned test environment', dur: 2000 },
    { id: 'fleetconfig', name: 'Fleet config', icon: '\u{1F4CA}', bundle: '#8', aws: ['IoT Core', 'DynamoDB'], desc: 'Fleet HW/SW validation', dur: 2200 },
    { id: 'integration', name: 'Multi-SWC integration', icon: '\u{1F517}', bundle: '#10', aws: ['Bedrock', 'Step Functions'], desc: 'Cross-component check', dur: 1800 },
    { id: 'deploy', name: 'OTA deployment', icon: '\u{1F4E1}', bundle: '#12', aws: ['CodeDeploy', 'IoT Core'], desc: 'Stage-based deployment', dur: 2000 },
    { id: 'promotion', name: 'Promotion gate', icon: '\u{1F6A6}', bundle: '#13', aws: ['Step Functions', 'DynamoDB'], desc: 'Stage promotion decision', dur: 2400 },
  ];

  if (mode === 'optB') {
    // Insert cybersec after remediation
    const remIdx = base.findIndex(s => s.id === 'remediation');
    base.splice(remIdx + 1, 0, {
      id: 'cybersec', name: 'Cybersecurity assessment', icon: '\u{1F6E1}', bundle: 'New',
      aws: ['Bedrock', 'SecurityHub'], desc: 'Threat model validation + attack surface', dur: 2400, isNew: true,
    });
    // Insert safety after testselect
    const tsIdx = base.findIndex(s => s.id === 'testselect');
    base.splice(tsIdx + 1, 0, {
      id: 'safety', name: 'Safety assessment', icon: '\u26A0\uFE0F', bundle: 'New',
      aws: ['Bedrock', 'DynamoDB', 'S3'], desc: 'ISO 26262 evidence chain + ASIL gate', dur: 2600, isNew: true,
    });
    // Insert sbom after cicd
    const cicdIdx = base.findIndex(s => s.id === 'cicd');
    base.splice(cicdIdx + 1, 0, {
      id: 'sbom', name: 'Supply chain compliance', icon: '\u{1F4CB}', bundle: 'New',
      aws: ['Inspector', 'Lambda', 'S3'], desc: 'SBOM validation + license + CVE policy', dur: 1800, isNew: true,
    });
  }

  return base;
}
