"""Test Agent — risk-based test selection + environment allocation."""

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


AGENT_NAME = "test_agent"
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
def fleet_query(variant: str = "", region: str = "", mileage_band: str = "", last_ota: str = "") -> dict:
    """Query the connected-vehicle fleet inventory and the regression-test corpus.

    Filters narrow the shadow-rollout sample. Returns:
        {
          "fleet": [{"vin_hash": "...", "variant": "...", "region": "...", ...}],
          "regression_tests": [{"test_id": "...", "covers": [...], "env": "VEW|SIL|HIL"}]
        }
    """
    return _gateway_invoke(
        "fleet_query",
        {"variant": variant, "region": region, "mileage_band": mileage_band, "last_ota": last_ota},
    )


@tool
def coverage_query(file_path: str) -> dict:
    """Fetch latest MC/DC, branch, statement coverage for the file."""
    return _gateway_invoke("coverage_query", {"file_path": file_path})


@tool
def code_interpreter(code: str) -> dict:
    """Execute Python in the Code Interpreter sandbox.

    Pre-installed: pytest, hypothesis, parameterised, pynguin (symbolic test
    synthesis), z3-solver, libclang.
    """
    started = time.time()
    response = _agentcore.start_code_interpreter_session(
        codeInterpreterId=os.environ["CODE_INTERPRETER_ID"]
    )
    session_id = response["sessionId"]
    exec_resp = _agentcore.invoke_code_interpreter(
        codeInterpreterId=os.environ["CODE_INTERPRETER_ID"],
        sessionId=session_id,
        code=code,
        language="python",
    )
    stdout = exec_resp.get("stdout", "")
    stderr = exec_resp.get("stderr")
    _emit(
        "code_execution",
        {
            "language": "python",
            "code": code,
            "stdout": stdout,
            "stderr": stderr,
            "duration_ms": int((time.time() - started) * 1000),
        },
    )
    return {"stdout": stdout, "stderr": stderr}


def main(payload: dict[str, Any]) -> dict[str, Any]:
    file_content = payload["file_content"]
    file_path = payload["file_path"]
    findings = payload.get("findings", [])

    _RUN_CTX["sessionId"] = payload.get("sessionId")
    _RUN_CTX["runId"] = payload.get("runId")
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit(
        "agent_invoked",
        {"task": "test selection + env allocation", "input": {"file_path": file_path, "n_findings": len(findings)}},
    )

    started = time.time()
    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT,
        tools=[fleet_query, coverage_query, code_interpreter],
    )

    user_msg = (
        f"Plan the test campaign for this file given the upstream findings.\n\n"
        f"File: {file_path}\n"
        f"Findings (from quality / safety / security):\n{json.dumps(findings, indent=2)[:4000]}\n\n"
        f"```\n{file_content[:6000]}\n```\n\n"
        "Return the JSON object as specified. Stay under the $50 per-PR budget."
    )

    try:
        result = agent(user_msg)
        try:
            output = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            output = {"tests_selected": [], "env_assignments": {}, "summary": {"raw": str(result.message)}}

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
