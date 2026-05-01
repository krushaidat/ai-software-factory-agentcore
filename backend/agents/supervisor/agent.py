"""Supervisor Agent — top-level orchestrator for the automotive software factory.

Implements the "Agents as Tools" pattern from the Strands Agents SDK: every
specialist is wrapped in a `@tool` function that proxies an InvokeAgentRuntime
call to the specialist's own AgentCore Runtime container. The supervisor
itself runs as an AgentCore Runtime container too (entry point: `main`).

All event emission (agent_invoked, tool_call, tool_result, memory_read, ...)
follows backend/agents/CONTRACTS.md exactly. The events are pushed via the
shared `_emit` helper so that the trace streamer Lambda can fan them out to
the WebSocket subscribers.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

import boto3
from strands import Agent, tool
from strands.models import BedrockModel

from .prompt import SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Constants & shared clients
# ---------------------------------------------------------------------------

AGENT_NAME = "supervisor"
MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"  # cross-region inference profile
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

_agentcore = boto3.client("bedrock-agentcore", region_name=AWS_REGION)
_events = boto3.client("events", region_name=AWS_REGION)


# ---------------------------------------------------------------------------
# Event emission (matches backend/agents/CONTRACTS.md)
# ---------------------------------------------------------------------------

_RUN_CTX: dict[str, Any] = {
    "sessionId": None,
    "runId": None,
    "spanId": None,
    "parentSpanId": None,
}


def _emit(event_type: str, payload: dict[str, Any]) -> None:
    """Publish an event to the EventBridge bus consumed by the trace streamer.

    The shape conforms to the common envelope in CONTRACTS.md.
    """
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
    except Exception as exc:  # noqa: BLE001 — events are best-effort
        print(f"[supervisor] event emit failed: {exc}")


# ---------------------------------------------------------------------------
# AgentCore Runtime / Memory helpers
# ---------------------------------------------------------------------------


def _invoke_agentcore_runtime(agent_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Invoke a specialist agent's AgentCore Runtime container."""
    runtime_arn = os.environ.get(f"{agent_name.upper()}_RUNTIME_ARN")
    if not runtime_arn:
        raise RuntimeError(f"Missing env var {agent_name.upper()}_RUNTIME_ARN")

    tool_call_id = f"tc-{uuid.uuid4().hex[:10]}"
    started = time.time()

    _emit(
        "tool_call",
        {
            "tool_name": agent_name,
            "via": "agentcore_runtime",
            "params": {"file_path": payload.get("file_path")},
            "tool_call_id": tool_call_id,
        },
    )
    _emit(
        "agent_invoked",
        {"task": f"delegate to {agent_name}", "input": {"file_path": payload.get("file_path")}},
    )

    response = _agentcore.invoke_agent_runtime(
        agentRuntimeArn=runtime_arn,
        payload=json.dumps(
            {
                **payload,
                "sessionId": _RUN_CTX["sessionId"],
                "runId": _RUN_CTX["runId"],
                "parentSpanId": _RUN_CTX["spanId"],
            }
        ).encode(),
        runtimeSessionId=_RUN_CTX["sessionId"] or "default",
    )
    body = json.loads(response["response"].read())
    duration_ms = int((time.time() - started) * 1000)

    _emit(
        "tool_result",
        {
            "tool_call_id": tool_call_id,
            "result": body,
            "duration_ms": duration_ms,
            "error": None,
        },
    )
    return body


def _query_agentcore_memory(strategy: str, query: str) -> list[dict[str, Any]]:
    memory_id = os.environ.get("MEMORY_ID")
    if not memory_id:
        return []

    started = time.time()
    response = _agentcore.retrieve_memory_records(
        memoryId=memory_id,
        namespace=f"strategy/{strategy.lower()}",
        searchCriteria={"searchQuery": query, "topK": 5},
    )
    matches = [
        {"text": r["content"]["text"], "score": r.get("score", 0.0)}
        for r in response.get("memoryRecordSummaries", [])
    ]
    _emit(
        "memory_read",
        {
            "strategy": strategy,
            "query": query,
            "matches": matches,
            "duration_ms": int((time.time() - started) * 1000),
        },
    )
    return matches


def _write_agentcore_memory(strategy: str, content: str, namespace: str) -> None:
    memory_id = os.environ.get("MEMORY_ID")
    if not memory_id:
        return
    _agentcore.create_memory_record(
        memoryId=memory_id,
        namespace=namespace,
        content={"text": content},
    )
    _emit(
        "memory_write",
        {"strategy": strategy, "content": content, "namespace": namespace},
    )


# ---------------------------------------------------------------------------
# Specialist agents exposed as tools
# ---------------------------------------------------------------------------


@tool
def invoke_quality_agent(file_content: str, file_path: str) -> dict:
    """Invoke the QualityAgent to analyse MISRA C/C++ and AUTOSAR rule violations.

    Args:
        file_content: The source code to analyse.
        file_path:    Original file path for context.

    Returns:
        dict with `findings`: list of {severity, rule, message, line, suggested_fix}
        and `metrics`: HIS code-metric values (complexity, nesting, fan-out).
    """
    return _invoke_agentcore_runtime(
        "quality_agent", {"file_content": file_content, "file_path": file_path}
    )


@tool
def invoke_safety_agent(file_content: str, file_path: str, asil_level: str = "B") -> dict:
    """Invoke the SafetyAgent for ISO 26262 evidence and ASIL classification.

    Args:
        file_content: source code under review.
        file_path:    file path (used to locate safety-goal mapping).
        asil_level:   target ASIL hint from the safety case (A/B/C/D); the
                      agent may upgrade or downgrade based on its analysis.
    """
    return _invoke_agentcore_runtime(
        "safety_agent",
        {"file_content": file_content, "file_path": file_path, "asil_level": asil_level},
    )


@tool
def invoke_security_agent(file_content: str, file_path: str) -> dict:
    """Invoke the SecurityAgent for ISO/SAE 21434 TARA and live CVE matching."""
    return _invoke_agentcore_runtime(
        "security_agent", {"file_content": file_content, "file_path": file_path}
    )


@tool
def invoke_test_agent(file_content: str, file_path: str, findings: list) -> dict:
    """Invoke the TestAgent to select tests and allocate VEW/SIL/HIL environments.

    Args:
        findings: aggregated findings from quality/safety/security agents,
                  used for risk-based test prioritisation.
    """
    return _invoke_agentcore_runtime(
        "test_agent",
        {"file_content": file_content, "file_path": file_path, "findings": findings},
    )


@tool
def invoke_deployment_agent(all_findings: dict) -> dict:
    """Invoke the DeploymentAgent for the promotion-gate decision and rollout plan.

    `all_findings` must be a dict keyed by agent name with each agent's full
    JSON output. The deployment agent is the SOLE source of truth for the
    promotion verdict — do not override it in the supervisor's response.
    """
    return _invoke_agentcore_runtime("deployment_agent", {"all_findings": all_findings})


@tool
def invoke_integration_agent(file_content: str, file_path: str) -> dict:
    """Invoke the IntegrationAgent for SBOM, cross-SWC compatibility, and ASPICE."""
    return _invoke_agentcore_runtime(
        "integration_agent", {"file_content": file_content, "file_path": file_path}
    )


@tool
def query_memory(strategy: str, query: str) -> list:
    """Query AgentCore Memory for relevant context.

    Args:
        strategy: One of USER_PREFERENCE | SEMANTIC | SUMMARY | SHORT_TERM.
        query:    Free-text search query.

    Returns:
        list of {text, score} ordered by descending relevance.
    """
    return _query_agentcore_memory(strategy, query)


# ---------------------------------------------------------------------------
# AgentCore Runtime entry point
# ---------------------------------------------------------------------------


def main(payload: dict[str, Any]) -> dict[str, Any]:
    """AgentCore Runtime invocation entry point.

    Receives `{file_content, file_path, mode, sessionId?, runId?}` and returns
    the supervisor's unified report.
    """
    file_content = payload["file_content"]
    file_path = payload["file_path"]
    mode = payload.get("mode", "base")

    _RUN_CTX["sessionId"] = payload.get("sessionId") or str(uuid.uuid4())
    _RUN_CTX["runId"] = payload.get("runId") or str(uuid.uuid4())
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit("pipeline_started", {"fileId": file_path, "mode": mode})
    _emit("agent_invoked", {"task": "supervise pipeline", "input": {"file_path": file_path, "mode": mode}})

    started = time.time()

    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT.format(mode=mode),
        tools=[
            invoke_quality_agent,
            invoke_safety_agent,
            invoke_security_agent,
            invoke_test_agent,
            invoke_deployment_agent,
            invoke_integration_agent,
            query_memory,
        ],
    )

    user_msg = (
        f"Analyse the following automotive software file and orchestrate the pipeline.\n\n"
        f"File: {file_path}\n"
        f"Mode: {mode}\n\n"
        f"```cpp\n{file_content[:8000]}\n```\n\n"
        "Run the appropriate specialists in parallel where possible, gather their findings, "
        "and return the unified JSON report."
    )

    try:
        result = agent(user_msg)
        duration_ms = int((time.time() - started) * 1000)

        try:
            summary = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            summary = {"raw_message": str(result.message)}

        agents_invoked = summary.get(
            "agents_invoked",
            ["quality", "safety", "security", "test", "deployment", "integration"]
            if mode == "optB"
            else ["quality", "test", "deployment", "integration"],
        )

        _emit(
            "agent_completed",
            {
                "result": summary,
                "tokens_in": getattr(result.metrics, "input_tokens", 0),
                "tokens_out": getattr(result.metrics, "output_tokens", 0),
                "duration_ms": duration_ms,
            },
        )
        _emit(
            "pipeline_completed",
            {
                "duration_ms": duration_ms,
                "totalTokens": getattr(result.metrics, "total_tokens", 0),
                "totalCost": getattr(result.metrics, "total_cost", 0.0),
                "agentsInvoked": agents_invoked,
            },
        )

        # Persist a SUMMARY memory record so future runs benefit from this verdict.
        verdict = summary.get("promotion_verdict", "unknown")
        _write_agentcore_memory(
            "SUMMARY",
            f"{file_path} -> {verdict} (mode={mode})",
            namespace=f"strategy/summary/{file_path}",
        )

        return {"summary": summary, "metadata": {"duration_ms": duration_ms}}

    except Exception as exc:  # noqa: BLE001
        _emit("agent_failed", {"error": str(exc), "retryable": True})
        _emit("pipeline_failed", {"error": str(exc)})
        raise
