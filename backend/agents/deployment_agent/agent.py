"""Deployment Agent — promotion-gate decision, fleet rollout, DTC + Jira."""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

import boto3
from strands import Agent, tool
from strands.models import BedrockModel

from prompt import SYSTEM_PROMPT


AGENT_NAME = "deployment_agent"
MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

_agentcore = boto3.client("bedrock-agentcore", region_name=AWS_REGION)
_events = boto3.client("events", region_name=AWS_REGION)

_RUN_CTX: dict[str, Any] = {"sessionId": None, "runId": None, "spanId": None, "parentSpanId": None}


def _emit(event_type: str, payload: dict[str, Any]) -> None:
    envelope = {
        "type": event_type,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "sessionId": _RUN_CTX["sessionId"],
        "runId": _RUN_CTX["runId"],
        "agentName": AGENT_NAME,
        "spanId": _RUN_CTX["spanId"],
        "parentSpanId": _RUN_CTX["parentSpanId"],
        "payload": payload,
    }
    try:
        _events.put_events(
            Entries=[
                {
                    "Source": "ai-software-factory.agents",
                    "DetailType": event_type,
                    "Detail": json.dumps(envelope),
                    "EventBusName": os.environ.get("EVENT_BUS_NAME", "default"),
                }
            ]
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[{AGENT_NAME}] event emit failed: {exc}")


def _gateway_invoke(target: str, params: dict[str, Any]) -> dict[str, Any]:
    gateway_url = os.environ["GATEWAY_URL"]
    tool_call_id = f"tc-{uuid.uuid4().hex[:10]}"
    started = time.time()
    _emit(
        "tool_call",
        {"tool_name": target, "via": "agentcore_gateway", "params": params, "tool_call_id": tool_call_id},
    )
    response = _agentcore.invoke_gateway_target(
        gatewayUrl=gateway_url, targetName=target, body=json.dumps(params).encode()
    )
    body = json.loads(response["body"].read())
    _emit(
        "tool_result",
        {"tool_call_id": tool_call_id, "result": body, "duration_ms": int((time.time() - started) * 1000), "error": None},
    )
    return body


@tool
def fleet_query(variant: str = "", region: str = "", current_version: str = "") -> dict:
    """Query the fleet inventory; returns cohort sizes for rollout planning."""
    return _gateway_invoke(
        "fleet_query", {"variant": variant, "region": region, "current_version": current_version}
    )


@tool
def dtc_register(dtc: str, swc: str, severity: str, description: str = "") -> dict:
    """Register a Diagnostic Trouble Code (DTC) in the DEM configuration.

    Args:
        dtc: 5-character UDS DTC, e.g. "P0AC0-12".
        swc: AUTOSAR SWC name, e.g. "BMS_Control".
        severity: ASIL letter A/B/C/D or QM.
        description: free-text description that ends up in the diag spec.
    """
    return _gateway_invoke(
        "dtc_register",
        {"dtc": dtc, "swc": swc, "severity": severity, "description": description},
    )


@tool
def jira_create(project: str, summary: str, description: str, priority: str = "High", labels: list | None = None) -> dict:
    """Create a Jira ticket via the Jira Cloud MCP target on the Gateway.

    Returns: {"key": "AUTO-12345", "url": "https://bosch.atlassian.net/browse/AUTO-12345"}
    """
    return _gateway_invoke(
        "jira_create",
        {
            "project": project,
            "summary": summary,
            "description": description,
            "priority": priority,
            "labels": labels or [],
        },
    )


def main(payload: dict[str, Any]) -> dict[str, Any]:
    all_findings = payload.get("all_findings", {})

    _RUN_CTX["sessionId"] = payload.get("sessionId")
    _RUN_CTX["runId"] = payload.get("runId")
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit(
        "agent_invoked",
        {
            "task": "promotion-gate decision + rollout planning",
            "input": {"agents": list(all_findings.keys())},
        },
    )

    started = time.time()
    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT,
        tools=[fleet_query, dtc_register, jira_create],
    )

    user_msg = (
        "Make the promotion-gate decision for this PR.\n\n"
        f"Aggregated findings from upstream agents:\n{json.dumps(all_findings, indent=2)[:12000]}\n\n"
        "Apply the deterministic gate rules in order. For every blocker, open a Jira ticket. "
        "For every documented limitation that is being shipped, register a DTC. "
        "Return the JSON object as specified."
    )

    try:
        result = agent(user_msg)
        try:
            output = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            output = {"promotion_verdict": "needs_review", "blockers": [], "summary": {"raw": str(result.message)}}

        _emit(
            "agent_completed",
            {
                "result": output,
                "tokens_in": getattr(result.metrics, "input_tokens", 0),
                "tokens_out": getattr(result.metrics, "output_tokens", 0),
                "duration_ms": int((time.time() - started) * 1000),
            },
        )
        return output
    except Exception as exc:  # noqa: BLE001
        _emit("agent_failed", {"error": str(exc), "retryable": True})
        raise
