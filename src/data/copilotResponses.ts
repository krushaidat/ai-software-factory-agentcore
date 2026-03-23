import type { CopilotQA } from '../types';

export const INITIAL_QUESTIONS = [
  'Why was VEW-001 selected?',
  'What blocks promotion to staging?',
  'Show the safety evidence chain',
  'Explain the MISRA 11.3 finding',
  "What's the estimated cost impact?",
  'How does the defect feedback loop work?',
];

export const COPILOT_QA: Record<string, CopilotQA> = {
  'Why was VEW-001 selected?': {
    question: 'Why was VEW-001 selected?',
    response: 'VEW-001 was selected as the primary test environment because it has **zero queue depth** (immediate availability), runs firmware **v3.4.1** which exactly matches the target baseline, and provides both **CAN bus simulation** and **brake model** capabilities required by PR #1847. It was ranked highest by the test environment agent over VEW-002 (queue depth: 2) and HIL-003 (firmware v3.4.0, reserved for actuator-specific validation).',
    followUps: ['What about HIL-003?', 'How is queue depth calculated?'],
  },
  'What blocks promotion to staging?': {
    question: 'What blocks promotion to staging?',
    response: 'Two items block promotion to Staging: **1) HIL-003 actuator validation** is still in queue (ETA ~2 hours) \u2014 this tests the physical brake actuator response with the new two-tier timeout logic. **2) BRAKE-4521 DTC mapping** has not been registered in the OEM diagnostic database yet. Until the new `DIAG_CAN_TIMEOUT` diagnostic trouble code is registered, the integration fleet cannot properly report timeout events during OEM UDS read-out sessions.',
    followUps: ['When will HIL-003 be available?', 'What is DTC mapping?'],
  },
  'Show the safety evidence chain': {
    question: 'Show the safety evidence chain',
    response: 'The ISO 26262 evidence chain for PR #1847 traces from **Safety Goal SG-BRAKE-01** ("Prevent unintended brake degradation") through the Functional Safety Requirement **FSR-BRAKE-014**, Technical Safety Requirement **TSR-BRAKE-047** (two-tier timeout at 200ms/500ms), down to requirement **BR-ECU-CAN-007** and the implementation in this PR. Verification shows **100% path coverage** and **94% branch coverage** across 89 tests. The ASIL-B evidence chain is complete and all tool confidence levels are documented per ISO 26262 Part 8.',
    followUps: ['What is ASIL-B?', 'Why is branch coverage only 94%?'],
  },
  'Explain the MISRA 11.3 finding': {
    question: 'Explain the MISRA 11.3 finding',
    response: 'MISRA Rule 11.3 prohibits implicit casts between different type categories. In this PR, `DiagLog_Write(DIAG_CAN_TIMEOUT, elapsed)` passes an integer enum constant where the function expects a `DiagCode_t` typed parameter. The auto-fix adds an explicit cast: `DiagLog_Write((DiagCode_t)DIAG_CAN_TIMEOUT, elapsed)`. Confidence is **98%** because this exact pattern was seen in **PR #1203** (ABS module) where the same fix was validated. Manual remediation took 3.2 hours in that case; the AI fix takes under 5 minutes.',
    followUps: ['What other MISRA rules were violated?', 'How is confidence calculated?'],
  },
  "What's the estimated cost impact?": {
    question: "What's the estimated cost impact?",
    response: 'For this single PR, the AI pipeline saved approximately **$652** in engineering time by automating code review (2.5h \u2192 45s), root cause analysis (3.2h \u2192 12s), test selection (47min \u2192 6min), and fleet configuration (45min \u2192 4s). Annualized across all PRs, the platform projects **$7.8M/year** in savings. The defect cluster DC-2025-0847 is now 58% resolved, preventing an estimated $180K in projected warranty claims from silent DTC data loss.',
    followUps: ['How is the $7.8M calculated?', 'What are the warranty claims about?'],
  },
  'How does the defect feedback loop work?': {
    question: 'How does the defect feedback loop work?',
    response: 'The defect feedback loop uses **Amazon Neptune** (graph database) to maintain a knowledge graph of code patterns, defect clusters, and historical fixes. When a new PR is submitted, the AI agent queries the graph for similar patterns. For PR #1847, it matched **defect cluster DC-2025-0847**: 12 PRs over 6 months where `RingBuffer_Push()` returns were unchecked, causing silent DTC data loss. The system detected 847 `DIAG_BUF_OVERFLOW` signals in fleet telemetry and 3 warranty claims ($180K projected). It proactively recommended a fix with 94% confidence and auto-created Jira ticket BRAKE-1850.',
    followUps: ['What is Neptune?', 'How many defect clusters exist?'],
  },
  'What about HIL-003?': {
    question: 'What about HIL-003?',
    response: 'HIL-003 is a Hardware-in-the-Loop bench with a **physical brake actuator**, making it essential for validating the actual brake response when transitioning from normal to degraded state. It runs firmware v3.4.0 (one minor version behind the target) which is acceptable for integration testing. Currently it has a queue depth of 1, with an ETA of approximately 2 hours. In ASIL-B mode, HIL actuator validation is **mandatory** and escalated to the priority queue.',
    followUps: ['Why was VEW-001 selected?', 'What blocks promotion to staging?'],
  },
  'How is queue depth calculated?': {
    question: 'How is queue depth calculated?',
    response: 'Queue depth represents the number of test jobs currently waiting to execute on a given environment. It is tracked in real-time via **Amazon DynamoDB** and updated as jobs are submitted, started, and completed. A queue depth of 0 means immediate availability. The test environment agent factors queue depth into its ranking algorithm: lower queue depth = faster time-to-result, which is weighted alongside capability match and firmware compatibility.',
    followUps: ['Why was VEW-001 selected?', "What's the estimated cost impact?"],
  },
  'When will HIL-003 be available?': {
    question: 'When will HIL-003 be available?',
    response: 'HIL-003 currently has **1 job** ahead in queue with an estimated completion time of approximately **2 hours**. Once available, the actuator validation suite (4 tests) will run the physical brake response test for the new two-tier timeout logic. This is a blocking requirement for promotion to Staging.',
    followUps: ['What blocks promotion to staging?', 'What about HIL-003?'],
  },
  'What is DTC mapping?': {
    question: 'What is DTC mapping?',
    response: 'DTC (Diagnostic Trouble Code) mapping registers new diagnostic codes in the OEM diagnostic database so that workshop tools and fleet monitoring systems can recognize and report them. PR #1847 introduces `DIAG_CAN_TIMEOUT` as a new diagnostic event, which needs a corresponding DTC entry (tracked in **BRAKE-4521**). Without this registration, the integration fleet cannot properly report CAN timeout events during standard UDS (Unified Diagnostic Services) read-out sessions used by OEM service technicians.',
    followUps: ['What blocks promotion to staging?', 'How does the defect feedback loop work?'],
  },
  'What is ASIL-B?': {
    question: 'What is ASIL-B?',
    response: 'ASIL (Automotive Safety Integrity Level) is defined by ISO 26262 and ranges from A (lowest) to D (highest). **ASIL-B** is the second level, indicating a moderate risk of harm. For the brake ECU CAN timeout handler, ASIL-B means: 100% path coverage required, MC/DC coverage recommended but not mandatory, safety evidence chain must be fully traceable, and auto-fixes above 95% confidence can be applied without human review (below that threshold, human sign-off is required).',
    followUps: ['Show the safety evidence chain', 'Why is branch coverage only 94%?'],
  },
  'Why is branch coverage only 94%?': {
    question: 'Why is branch coverage only 94%?',
    response: 'Branch coverage is at 94% because there are **defensive error paths** in the `EventBus_Publish` failure handling that are difficult to trigger in normal test conditions. For ASIL-B, the target is 100% path coverage (achieved) while branch coverage at 94% is acceptable since MC/DC is marked as "N/A" for ASIL-B (it becomes mandatory at ASIL-C and above). The 3 auto-generated tests covered the primary gap areas, bringing branch coverage from 87% to 94%.',
    followUps: ['What is ASIL-B?', 'Show the safety evidence chain'],
  },
  'What other MISRA rules were violated?': {
    question: 'What other MISRA rules were violated?',
    response: 'Three findings were detected: **MISRA 11.3** (critical \u2014 implicit enum cast, auto-fix at 98% confidence), **MISRA 17.7** (warning \u2014 unchecked `RingBuffer_Push` return, guided fix at 87% confidence), and **Bosch-042** (info \u2014 missing DOORS traceability for timeout thresholds, auto-fix available). In Option A/B modes, an additional **ISO 21434-TA** threat finding flags the CAN bus attack surface.',
    followUps: ['Explain the MISRA 11.3 finding', 'How does the defect feedback loop work?'],
  },
  'How is confidence calculated?': {
    question: 'How is confidence calculated?',
    response: 'Fix confidence is computed by the AI remediation agent by comparing the current finding against **historical fix patterns** in the knowledge graph. For MISRA 11.3, the 98% confidence comes from matching PR #1203 (ABS module) where the identical pattern was successfully fixed and validated. The model considers: pattern similarity (semantic match), test pass rate of historical fixes, number of similar fixes in the graph (more examples = higher confidence), and component risk level (ASIL rating adjusts the threshold).',
    followUps: ['Explain the MISRA 11.3 finding', "What's the estimated cost impact?"],
  },
  'How is the $7.8M calculated?': {
    question: 'How is the $7.8M calculated?',
    response: 'The $7.8M annualized savings is calculated across all pipeline stages: code review (2.5h\u219245s per PR, -97%), root cause analysis (3.2h\u219212s, -99%), test selection (47min\u21926min, -87%), fleet config (45min\u21924s, -99%), and cross-SWC integration (1.5h\u21928s, -99%). Multiplied by ~25 PRs/week, 52 weeks, at an average loaded engineering cost of $85/hour. In Option A/B modes, safety evidence (-99%), cybersecurity assessment (-99%), and SBOM generation (-99%) add additional savings.',
    followUps: ["What's the estimated cost impact?", 'How does the defect feedback loop work?'],
  },
  'What are the warranty claims about?': {
    question: 'What are the warranty claims about?',
    response: 'The 3 warranty claims ($180K projected) relate to **defect cluster DC-2025-0847**: unchecked `RingBuffer_Push()` returns in diagnostic logging code caused silent data loss when the diagnostic buffer was full. During OEM UDS read-out at BMW service centers, technicians could not retrieve complete DTC histories, leading to misdiagnosis and repeat visits. The AI defect feedback loop detected 847 `DIAG_BUF_OVERFLOW` signals in fleet telemetry that correlated with the warranty cases.',
    followUps: ['How does the defect feedback loop work?', "What's the estimated cost impact?"],
  },
  'What is Neptune?': {
    question: 'What is Neptune?',
    response: 'Amazon Neptune is a managed **graph database** service used by the AI Software Factory to store and query the knowledge graph. The graph captures relationships between code patterns, defect clusters, test coverage data, and historical fixes. For example, it can traverse from a MISRA finding \u2192 similar historical PRs \u2192 known defect clusters \u2192 fleet telemetry signals \u2192 warranty impact, enabling the AI to provide proactive fix recommendations with quantified business impact.',
    followUps: ['How does the defect feedback loop work?', "What's the estimated cost impact?"],
  },
  'How many defect clusters exist?': {
    question: 'How many defect clusters exist?',
    response: 'The knowledge graph currently tracks **23 active defect clusters** across the brake ECU codebase. DC-2025-0847 (unchecked buffer writes) is the most impactful with 12 PRs and $180K in projected warranty costs. The AI continuously mines fleet telemetry data and code review patterns to identify emerging clusters. When a new PR matches a known cluster pattern, the system proactively suggests fixes and creates Jira tickets to address remaining instances.',
    followUps: ['How does the defect feedback loop work?', 'What is Neptune?'],
  },
};

export const TYPING_DELAY_MS = 800;
