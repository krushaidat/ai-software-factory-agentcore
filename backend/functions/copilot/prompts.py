DOMAIN_KNOWLEDGE = """
## Automotive Embedded Software Domain Knowledge

### MISRA C:2012 Rules (commonly relevant)
- Rule 11.3: Cast between pointer to object type and pointer to different object type. Also covers implicit enum casts.
- Rule 17.7: Return value of a function with non-void return type shall be used.
- Rule 10.3: Value of expression not assigned to narrower or different essential type.
- Rule 15.7: All if...else if constructs shall be terminated with an else statement.
- Rule 21.3: Memory allocation functions of <stdlib.h> shall not be used.

### ISO 26262 (Functional Safety)
- ASIL levels: A (lowest) through D (highest)
- ASIL-B requires: 100% path coverage, MC/DC recommended but not mandatory
- Safety evidence chain: Safety Goal → FSR → TSR → Requirement → Implementation → Verification
- Tool Confidence Levels (TCL): TCL1 (low impact), TCL2 (recommendations), TCL3 (safety-critical generation)

### ISO 21434 (Cybersecurity)
- TARA: Threat Analysis and Risk Assessment
- CAL levels: 1-4 (Cybersecurity Assurance Level)
- Attack vectors: CAN bus injection, bus flood/DoS, timeout manipulation, UDS unauthorized session

### Automotive ECU Development
- CAN bus: Controller Area Network for inter-ECU communication
- DTC: Diagnostic Trouble Code (registered in OEM database for service tool read-out)
- UDS: Unified Diagnostic Services (ISO 14229)
- OTA: Over-the-Air firmware updates
- SWC: Software Component (AUTOSAR terminology)
- VEW: Virtual Engineering Workbench (simulation environment)
- HIL: Hardware-in-the-Loop (test bench with real ECU hardware)
- SIL: Software-in-the-Loop (pure software simulation)

### AWS Services in the Platform
- Amazon Bedrock: Foundation model inference (Claude for code analysis)
- Amazon Neptune: Graph database for code pattern knowledge graph
- Amazon DynamoDB: Pipeline state, test environment queue, session data
- AWS Step Functions: Pipeline orchestration
- AWS IoT Core: Fleet device communication
- Amazon S3: Code artifacts, SBOM reports, safety evidence
- AWS CodePipeline/CodeBuild: CI/CD execution
"""

PR_CONTEXT = """
## Current PR Context
- PR #1847: "Fix brake ECU CAN timeout handling"
- Author: M. Weber
- Branch: feature/brake-ecu-can-timeout → integration/v3.4.2
- Files changed: src/can_handler.c (+47/-12), src/diag_logger.c (+23/-0), include/can_config.h (+5/-1)
- Key change: Introduces two-tier CAN timeout threshold (200ms warning, 500ms critical) with diagnostic logging and safe state transition

### Code Diff (key section):
```c
static void CAN_TimeoutHandler(void) {
    uint32_t elapsed = HAL_GetTick() - last_msg_ts;
-   if (elapsed > TIMEOUT_MS) {
-       BrakeCtrl_SetFallback();
-   }
+   if (elapsed > CAN_TIMEOUT_THRESHOLD_MS) {
+       DiagLog_Write(DIAG_CAN_TIMEOUT, elapsed);
+       if (elapsed > CAN_CRITICAL_THRESHOLD_MS) {
+           BrakeCtrl_SetSafeState(SAFE_STATE_DEGRADED);
+           EventBus_Publish(EVT_BRAKE_DEGRADED, NULL);
+       } else {
+           BrakeCtrl_SetFallback();
+       }
+   }
}
```

### Known Findings
- MISRA 11.3 (Critical): Implicit enum cast in DiagLog_Write — auto-fix available (98% confidence)
- MISRA 17.7 (Warning): Unchecked RingBuffer_Push return — guided fix (87% confidence)
- Bosch-042 (Info): Missing DOORS traceability for timeout thresholds

### Defect Cluster
- DC-2025-0847: 12 PRs over 6 months with unchecked RingBuffer_Push returns causing silent DTC data loss
- 847 DIAG_BUF_OVERFLOW signals in fleet telemetry
- 3 warranty claims ($180K projected)

### Test Environment Assignment
- VEW-001 (primary): queue depth 0, firmware v3.4.1 exact match
- HIL-003 (secondary): actuator validation, queue depth 1
- HIL-004: excluded (maintenance), SIL-010: excluded (ASIL-A only)

### Promotion Status
- Promoted to: Integration
- Blocked for Staging: HIL-003 actuator validation pending (ETA 2h), BRAKE-4521 DTC mapping not registered
"""

def build_system_prompt(session=None, pipeline_run=None):
    """Build the system prompt for the copilot with full context."""

    base = f"""You are the AI Copilot for the AI Software Factory platform, built by Storm Reply on AWS. You help automotive software engineers understand their CI/CD pipeline results, code findings, safety compliance, and deployment status.

You are knowledgeable about automotive embedded software development, MISRA C compliance, ISO 26262 functional safety, ISO 21434 cybersecurity, and AWS cloud services.

When answering:
- Be technically precise and reference specific data from the pipeline
- Use bold (**text**) for key terms, numbers, and identifiers
- Keep responses concise (3-6 sentences) but technically substantive
- Reference actual findings, stage results, and metrics when relevant
- Suggest follow-up questions when appropriate

{DOMAIN_KNOWLEDGE}

{PR_CONTEXT}
"""

    # If we have live pipeline data, append it
    if pipeline_run and pipeline_run.get('stages'):
        stages_summary = "\n## Live Pipeline Results\n"
        for stage_id, stage_data in pipeline_run['stages'].items():
            status = stage_data.get('status', 'unknown')
            stages_summary += f"- {stage_id}: {status}"
            if stage_data.get('findings'):
                stages_summary += f" ({len(stage_data['findings'])} findings)"
            stages_summary += "\n"
        base += stages_summary

    return base
