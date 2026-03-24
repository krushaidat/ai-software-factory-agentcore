"""
Stage-specific Bedrock prompts for the AI Software Factory pipeline.

Each stage calls Claude with a tailored system prompt and user message.
The JSON output schemas match the frontend panel data shapes.
"""

import json


def get_stage_prompt(stage_id: str, code: str, mode: str, previous_results: dict) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for the given stage."""
    builder = STAGE_PROMPTS.get(stage_id)
    if not builder:
        raise ValueError(f"Unknown stage: {stage_id}")
    return builder(code, mode, previous_results)


# ---------------------------------------------------------------------------
# Helper to format previous results into context
# ---------------------------------------------------------------------------

def _prev_context(previous_results: dict, keys: list[str]) -> str:
    """Format selected previous stage results as context for downstream stages."""
    parts = []
    for k in keys:
        if k in previous_results:
            parts.append(f"--- Previous stage '{k}' results ---\n{json.dumps(previous_results[k], indent=2)}")
    return "\n\n".join(parts) if parts else "No previous stage results available yet."


# ---------------------------------------------------------------------------
# Stage: cicd
# ---------------------------------------------------------------------------

def _cicd(code: str, mode: str, previous_results: dict):
    system = """You are an automotive CI/CD build analysis agent for Bosch embedded software.
Analyze the provided C/C++ source code and determine the CI/CD build pipeline results.
You must evaluate: compiler compatibility (arm-gcc 12.3, AUTOSAR MCAL toolchain), static analysis gates,
unit test compilation, linker map analysis, and build artifact generation.

Return your analysis as a JSON object with this exact schema:
{
  "buildStatus": "pass" | "fail",
  "compiler": {"name": "string", "version": "string", "target": "string", "warnings": number, "errors": number},
  "steps": [
    {"name": "string", "status": "pass"|"fail"|"warn", "duration": "string", "detail": "string"}
  ],
  "artifacts": [
    {"name": "string", "size": "string", "type": "string"}
  ],
  "unitTestSummary": {"total": number, "passed": number, "failed": number, "skipped": number},
  "staticAnalysisSummary": {"misraViolations": number, "compilerWarnings": number, "linkerIssues": number}
}

Guidelines:
- Evaluate the code for MISRA C:2012 compliance issues visible in the source.
- Check for AUTOSAR C++14 coding guidelines if C++ constructs are present.
- Estimate unit test counts based on function complexity and branch paths.
- Include realistic build step timings for an embedded ARM Cortex-M target.
- Report any implicit type conversions, missing return checks, or unguarded casts.

Return ONLY valid JSON. No markdown, no explanation."""

    user = f"""Analyze this automotive embedded code for CI/CD build pipeline results.
Mode: {mode}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: review
# ---------------------------------------------------------------------------

def _review(code: str, mode: str, previous_results: dict):
    system = """You are an automotive code review agent specializing in MISRA C:2012, AUTOSAR, and Bosch internal coding standards.
Analyze the provided source code and produce structured findings.

Return a JSON object with this exact schema:
{
  "findings": [
    {
      "sev": "critical"|"warning"|"info"|"threat",
      "rule": "string (e.g. MISRA 11.3, Bosch-042, ISO 21434-TA)",
      "msg": "string describing the issue and fix availability with confidence percentage",
      "fix": "string with the corrected code snippet or null",
      "auto": boolean (true if auto-fixable with high confidence),
      "asil": "A"|"B"|"C"|"D"|null,
      "isThreat": boolean (only true for cybersecurity threat findings)
    }
  ],
  "summary": {
    "critical": number,
    "warning": number,
    "info": number,
    "threat": number,
    "autoFixable": number
  }
}

Guidelines:
- Check for MISRA C:2012 violations: implicit casts (Rule 11.3), unchecked returns (Rule 17.7),
  pointer arithmetic (Rule 18.4), macro usage (Rule 20.x), and type width issues.
- Check Bosch internal rules: DOORS traceability comments (Bosch-042), naming conventions,
  safety-critical function annotations.
- For mode 'optB', also check ISO 21434 threat analysis: identify attack surfaces on CAN bus,
  diagnostic interfaces, and timeout manipulation vectors.
- Assign ASIL ratings based on the component's safety context.
- Provide confidence percentages for auto-fix suggestions.
- Reference specific line patterns in the code when describing findings.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['cicd'])
    user = f"""Review this automotive embedded code for quality and compliance findings.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: remediation
# ---------------------------------------------------------------------------

def _remediation(code: str, mode: str, previous_results: dict):
    system = """You are an automotive code remediation agent. Given code review findings, generate
remediation actions with historical defect cluster correlation.

Return a JSON object with this exact schema:
{
  "remediations": [
    {
      "t": "string (rule + short description)",
      "h": "string (historical match info: matched PR, time savings)",
      "ft": "Auto-fix PR"|"Guided fix"|"Manual review",
      "c": "string (confidence percentage, e.g. '98%')"
    }
  ],
  "defectCluster": {
    "id": "string (e.g. DC-2025-XXXX)",
    "matchedPRs": number,
    "timespan": "string",
    "rootCause": "string",
    "resolvedPct": number
  },
  "totalTimeSaved": "string (e.g. '3.2 hrs -> 5 min')"
}

Guidelines:
- Correlate each finding with historical defect clusters from similar Bosch ECU projects.
- Reference realistic PR numbers and defect cluster IDs.
- Calculate time savings: compare manual remediation time vs AI-assisted time.
- For auto-fixable issues, generate the exact fix with high confidence.
- For guided fixes, describe the pattern and link to the knowledge graph.
- Track defect cluster resolution progress across the codebase.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['cicd', 'review'])
    user = f"""Generate remediation actions for the code review findings.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: testselect
# ---------------------------------------------------------------------------

def _testselect(code: str, mode: str, previous_results: dict):
    system = """You are an automotive test selection agent. Analyze code changes to select the optimal
test suite from the test repository, considering ASIL requirements, coverage targets, and cost.

Return a JSON object with this exact schema:
{
  "selectedTests": {
    "unit": {"count": number, "autoGenerated": number, "coverageTarget": "string"},
    "integration": {"count": number, "coverageTarget": "string"},
    "regression": {"count": number, "reason": "string"},
    "actuator": {"count": number, "reason": "string"}
  },
  "totalTests": number,
  "coverageAnalysis": {
    "pathCoverage": "string (percentage)",
    "branchCoverage": "string (percentage)",
    "mcdc": "string (MC/DC coverage percentage for ASIL-B+)"
  },
  "reasoning": "string explaining test selection strategy",
  "costEstimate": {
    "vewHours": number,
    "hilHours": number,
    "estimatedCost": "string"
  }
}

Guidelines:
- For ASIL-B components, require MC/DC coverage (ISO 26262 Part 6, Table 12).
- Select tests based on code change impact analysis: modified functions, call graph dependencies.
- Auto-generate tests for uncovered branches using the code structure.
- Include regression tests for related CAN bus and diagnostic subsystems.
- Estimate VEW and HIL execution hours with realistic timing.
- Consider the AUTOSAR SWC architecture when selecting integration tests.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['review', 'remediation'])
    user = f"""Select the optimal test suite for this automotive code change.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: testenv
# ---------------------------------------------------------------------------

def _testenv(code: str, mode: str, previous_results: dict):
    system = """You are an automotive test environment allocation agent. Given test requirements,
select and allocate test environments (VEW, HIL, SIL, Fleet) based on capabilities, ASIL rating,
firmware compatibility, and queue depth.

Return a JSON object with this exact schema:
{
  "environments": [
    {
      "id": "string (e.g. VEW-001)",
      "type": "VEW"|"HIL"|"SIL"|"Fleet",
      "status": "available"|"maintenance"|"in-use",
      "capabilities": ["string"],
      "hwRevision": "string",
      "fwVersion": "string",
      "queueDepth": number,
      "asilCapable": "A"|"B"|"C"|"D"
    }
  ],
  "reasoning": [
    {"step": "string", "conclusion": "string"}
  ],
  "assignments": [
    {"testGroup": "string", "envId": "string", "reason": "string"}
  ],
  "skippedEnvs": [
    {"id": "string", "reason": "string"}
  ]
}

Guidelines:
- VEW (Virtual ECU Workbench): suitable for unit and integration tests, ASIL up to B.
- HIL (Hardware-in-the-Loop): required for actuator validation, ASIL up to D.
- SIL (Software-in-the-Loop): suitable for early validation, ASIL A only.
- Fleet: reserved for OTA deployment validation, not used for pre-merge.
- Check firmware version compatibility with the code under test.
- Prefer environments with zero queue depth and exact firmware match.
- For ASIL-B brake components, VEW is minimum; HIL required for actuator tests.
- Provide step-by-step reasoning for environment selection decisions.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['testselect'])
    user = f"""Allocate test environments for the selected test suite.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: fleetconfig
# ---------------------------------------------------------------------------

def _fleetconfig(code: str, mode: str, previous_results: dict):
    system = """You are an automotive fleet configuration agent. Analyze ECU fleet compatibility
for the code change, checking hardware revisions, firmware baselines, and toolchain alignment.

Return a JSON object with this exact schema:
{
  "fleetStatus": [
    {"id": "string (env ID)", "status": "deployed"|"blocked"|"pending", "time": "string (UTC timestamp or reason)"}
  ],
  "compatibility": {
    "totalNodes": number,
    "compliant": number,
    "driftDetected": number,
    "driftDetails": ["string describing each drift issue"]
  },
  "deploymentPlan": {
    "strategy": "rolling"|"canary"|"blue-green",
    "phases": [{"phase": "string", "targets": ["string"], "criteria": "string"}]
  }
}

Guidelines:
- Check each ECU node for hardware revision compatibility with the new firmware.
- Detect toolchain drift: mismatched compiler versions, linker configurations, or MCAL versions.
- Flag any nodes in maintenance or with outdated firmware baselines.
- Recommend a deployment strategy based on the ASIL level and fleet size.
- Include realistic UTC timestamps for deployment scheduling.
- Consider CAN bus network topology when planning fleet rollout order.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['testenv'])
    user = f"""Analyze fleet configuration and ECU compatibility for this code change.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: integration
# ---------------------------------------------------------------------------

def _integration(code: str, mode: str, previous_results: dict):
    system = """You are an automotive integration analysis agent. Evaluate cross-SWC (Software Component)
compatibility, DTC (Diagnostic Trouble Code) mapping, and AUTOSAR event bus interactions.

Return a JSON object with this exact schema:
{
  "crossSwcChecks": [
    {"swc": "string", "status": "compatible"|"incompatible"|"warning", "detail": "string"}
  ],
  "dtcMapping": [
    {"code": "string (e.g. BRAKE-4521)", "status": "registered"|"pending"|"missing", "detail": "string"}
  ],
  "eventBusUpdates": [
    {"event": "string", "producer": "string", "consumer": "string", "status": "verified"|"new"|"deprecated"}
  ],
  "graphUpdates": ["string (knowledge graph edge in 'A -> B' format)"],
  "integrationVerdict": "pass"|"warn"|"fail"
}

Guidelines:
- Check compatibility with dependent SWCs: SWC_VehicleDynamics, SWC_Diagnostics, SWC_SafetyManager.
- Verify DTC codes are registered in the OEM diagnostic database.
- Map AUTOSAR event bus signals: EVT_BRAKE_DEGRADED, EVT_CAN_TIMEOUT, etc.
- Update the knowledge graph with new relationships discovered during integration.
- Verify CAN bus message IDs and signal definitions match the DBC file.
- Check for backward compatibility with existing calibration data.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['testenv', 'fleetconfig'])
    user = f"""Evaluate cross-SWC integration and DTC mapping for this code change.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: deploy
# ---------------------------------------------------------------------------

def _deploy(code: str, mode: str, previous_results: dict):
    system = """You are an automotive deployment analysis agent. Evaluate deployment readiness,
ASPICE quality gates (SWE.1 through SWE.5), and OEM release report content.

Return a JSON object with this exact schema:
{
  "qualityGates": [
    {"label": "string (e.g. 'SWE1 - Requirements')", "status": "Full"|"Partial"|"Manual"|"Pending", "detail": "string"}
  ],
  "oemReport": [
    {"title": "string", "content": "string (2-3 sentence summary)"}
  ],
  "jiraUpdates": [
    {"key": "string (ticket ID)", "action": "Closed"|"Created"|"Updated"|"string", "detail": "string"}
  ],
  "metricsComparison": [
    {"label": "string", "before": "string (manual time)", "after": "string (AI time)", "change": "string (percentage)"}
  ]
}

Guidelines:
- Evaluate ASPICE SWE.1-SWE.5 quality gates based on the pipeline results so far.
- SWE.1 (Requirements): check DOORS traceability coverage.
- SWE.2 (Architecture): check EventBus and SWC interface documentation.
- SWE.3 (Detailed Design): flag as Manual per ASPICE process requirements.
- SWE.4 (Unit Test): summarize test results from previous stages.
- SWE.5 (Integration): check cross-SWC validation status.
- Generate OEM release report sections with technical detail.
- Create Jira ticket updates for the code change lifecycle.
- Calculate time savings metrics: manual vs AI-assisted for each activity.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['cicd', 'review', 'remediation', 'testselect', 'testenv', 'fleetconfig', 'integration'])
    user = f"""Evaluate deployment readiness and generate release artifacts for this code change.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: promotion
# ---------------------------------------------------------------------------

def _promotion(code: str, mode: str, previous_results: dict):
    system = """You are an automotive promotion gate agent. Evaluate all pipeline stage results
and determine the promotion path through Dev -> Integration -> Staging -> Pre-Production -> Production.

Return a JSON object with this exact schema:
{
  "promotionPath": [
    {"name": "Dev"|"Integration"|"Staging"|"Pre-Production"|"Production", "status": "passed"|"current"|"blocked"|"future"}
  ],
  "gateCriteria": [
    {
      "source": "string (stage name)",
      "criterion": "string",
      "verdict": "pass"|"warn"|"block"|"pending",
      "confidence": "string (percentage or dash)",
      "detail": "string"
    }
  ],
  "recommendation": {
    "approved": "string (highest approved stage)",
    "blocked": "string (first blocked stage)",
    "blockers": ["string describing each blocker"]
  },
  "asilApproval": {
    "required": boolean,
    "level": "string (ASIL level)",
    "rule": "string (approval rule description)",
    "approver": "string (role and name)",
    "status": "pending"|"approved"|"rejected",
    "signatureRef": "string"
  }
}

Guidelines:
- Aggregate verdicts from ALL previous stages: cicd, review, remediation, testselect, testenv,
  fleetconfig, integration, deploy.
- For mode 'optB', also include cybersecurity, safety, and SBOM gate criteria.
- A single 'block' verdict prevents promotion beyond the current stage.
- 'warn' verdicts allow promotion but require monitoring.
- ASIL-B and above always requires human sign-off for Staging promotion.
- Include realistic approver information and signature references.
- Identify the highest stage the code can be promoted to and list all blockers.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['cicd', 'review', 'remediation', 'testselect', 'testenv', 'fleetconfig', 'integration', 'deploy'])
    user = f"""Evaluate promotion gate criteria and determine the promotion path.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: cybersec (optB only)
# ---------------------------------------------------------------------------

def _cybersec(code: str, mode: str, previous_results: dict):
    system = """You are an automotive cybersecurity assessment agent following ISO/SAE 21434.
Perform a TARA (Threat Analysis and Risk Assessment) on the provided code.

Return a JSON object with this exact schema:
{
  "threats": [
    {
      "id": "string (e.g. CS-BRAKE-001)",
      "category": "Spoofing"|"Tampering"|"Repudiation"|"Information Disclosure"|"Denial of Service"|"Elevation of Privilege",
      "attackSurface": "string (e.g. CAN bus interface)",
      "description": "string",
      "riskLevel": "high"|"medium"|"low",
      "mitigation": "string",
      "jiraTicket": "string (ticket to create)"
    }
  ],
  "taraScore": {"overall": "string", "confidentiality": "string", "integrity": "string", "availability": "string"},
  "recommendations": ["string"],
  "complianceStatus": {
    "iso21434": "compliant"|"partial"|"non-compliant",
    "gaps": ["string"]
  }
}

Guidelines:
- Apply STRIDE threat modeling to all external interfaces: CAN bus, diagnostic (UDS), OTA update.
- Assess CAN bus flood/injection attacks on timeout handlers.
- Check for hardcoded thresholds that could be manipulated.
- Evaluate diagnostic interface access control.
- Check for timing side-channels in safety-critical paths.
- Reference ISO/SAE 21434 clauses for each finding.
- Recommend specific mitigations: rate limiting, message authentication, secure boot verification.
- Create Jira tickets for each actionable finding.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['review', 'remediation'])
    user = f"""Perform an ISO 21434 cybersecurity threat analysis on this automotive code.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: safety (optB only)
# ---------------------------------------------------------------------------

def _safety(code: str, mode: str, previous_results: dict):
    system = """You are an automotive functional safety agent following ISO 26262.
Build the safety evidence chain from safety goals down to verification results.

Return a JSON object with this exact schema:
{
  "safetyChain": [
    {
      "level": "Safety goal"|"FSR"|"TSR"|"Requirement"|"Implementation"|"Verification",
      "id": "string",
      "text": "string",
      "asil": "A"|"B"|"C"|"D"
    }
  ],
  "toolConfidence": [
    {
      "tool": "string (e.g. 'Bedrock - Code review agent')",
      "tcl": "TCL1"|"TCL2"|"TCL3",
      "rationale": "string explaining TCL assignment per ISO 26262 Part 8"
    }
  ],
  "coverageTargets": {
    "statementCoverage": "string",
    "branchCoverage": "string",
    "mcdcCoverage": "string",
    "pathCoverage": "string"
  },
  "safetyVerdict": "pass"|"conditional"|"fail",
  "conditions": ["string (any conditions for pass)"]
}

Guidelines:
- Trace from safety goals (SG) through functional safety requirements (FSR),
  technical safety requirements (TSR), to implementation and verification.
- Assign ASIL ratings based on the component's position in the safety architecture.
- For ASIL-B brake components, require MC/DC coverage per ISO 26262 Part 6 Table 12.
- Classify AI tools by Tool Confidence Level (TCL) per ISO 26262 Part 8:
  - TCL1: tool output does not affect safety-critical code directly.
  - TCL2: tool output may affect safety; requires validation.
  - TCL3: tool output directly modifies safety-critical code; requires full qualification.
- Include realistic safety goal IDs, FSR IDs, and requirement references.
- Reference Bosch internal safety processes and DOORS requirement IDs.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['review', 'remediation', 'testselect'])
    user = f"""Build the ISO 26262 safety evidence chain for this automotive code.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage: sbom (optB only)
# ---------------------------------------------------------------------------

def _sbom(code: str, mode: str, previous_results: dict):
    system = """You are an automotive SBOM (Software Bill of Materials) analysis agent.
Generate a dependency tree with license compliance and vulnerability assessment.

Return a JSON object with this exact schema:
{
  "dependencies": [
    {
      "name": "string (top-level SWC name)",
      "ver": "string (version)",
      "license": "string",
      "vulns": number,
      "children": [
        {"name": "string (e.g. conan/brake_hal)", "ver": "string", "license": "string", "vulns": number}
      ]
    }
  ],
  "licenseCompliance": {
    "approved": number,
    "flagged": number,
    "details": ["string"]
  },
  "vulnerabilities": {
    "critical": number,
    "high": number,
    "medium": number,
    "low": number,
    "cves": [{"id": "string", "severity": "string", "package": "string", "description": "string"}]
  },
  "supplyChainVerdict": "pass"|"warn"|"fail"
}

Guidelines:
- Analyze #include directives and library references to build the dependency tree.
- Use Conan package manager naming conventions for automotive C/C++ libraries.
- Check common automotive dependencies: RTOS ports, HAL layers, diagnostic libraries, CAN stacks.
- Evaluate license compatibility: Proprietary, MIT, Apache 2.0, BSD-3, GPL (flag GPL for embedded).
- Check for known CVEs in common embedded library versions.
- Flag any dependencies with known supply chain risks.
- Assign the top-level SWC name based on the code's functional domain.

Return ONLY valid JSON."""

    prev = _prev_context(previous_results, ['cicd'])
    user = f"""Generate an SBOM dependency analysis for this automotive code.
Mode: {mode}

{prev}

Source code:
```c
{code}
```"""

    return system, user


# ---------------------------------------------------------------------------
# Stage prompt registry
# ---------------------------------------------------------------------------

STAGE_PROMPTS = {
    'cicd': _cicd,
    'review': _review,
    'remediation': _remediation,
    'testselect': _testselect,
    'testenv': _testenv,
    'fleetconfig': _fleetconfig,
    'integration': _integration,
    'deploy': _deploy,
    'promotion': _promotion,
    'cybersec': _cybersec,
    'safety': _safety,
    'sbom': _sbom,
}
