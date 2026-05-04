"""Safety Agent — ISO 26262 evidence + ASIL classification."""

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


AGENT_NAME = "safety_agent"
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
def requirement_lookup(swc_id: str) -> dict:
    """Fetch linked FSR/TSR safety requirements for a SWC from the requirements graph."""
    return _gateway_invoke("requirement_lookup", {"swc_id": swc_id, "kind": "safety"})


@tool
def coverage_query(file_path: str) -> dict:
    """Fetch latest MC/DC, branch, and statement coverage for the file from the test data lake."""
    return _gateway_invoke("coverage_query", {"file_path": file_path})


@tool
def code_interpreter(code: str) -> dict:
    """Execute Python in the Code Interpreter sandbox.

    Pre-installed: libclang, networkx, ply (for ARXML parsing), z3-solver
    (for FFI proofs).
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


@tool
def a2a_quality(question: str) -> dict:
    """Ask the Quality Agent for a metric or rule check (A2A protocol).

    Used to avoid recomputing v(g), nesting depth, etc. The Safety Agent
    surfaces this as an `a2a_message` event with purpose=asil_evidence.
    """
    runtime_arn = os.environ["QUALITY_AGENT_RUNTIME_ARN"]
    _emit(
        "a2a_message",
        {
            "from": AGENT_NAME,
            "to": "quality_agent",
            "message": question,
            "purpose": "asil_evidence",
        },
    )
    response = _agentcore.invoke_agent_runtime(
        agentRuntimeArn=runtime_arn,
        payload=json.dumps({"a2a_question": question, "sessionId": _RUN_CTX["sessionId"]}).encode(),
        runtimeSessionId=_RUN_CTX["sessionId"] or "default",
    )
    return json.loads(response["response"].read())


def main(payload: dict[str, Any]) -> dict[str, Any]:
    file_content = payload["file_content"]
    file_path = payload["file_path"]
    asil_hint = payload.get("asil_level", "B")

    _RUN_CTX["sessionId"] = payload.get("sessionId")
    _RUN_CTX["runId"] = payload.get("runId")
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit(
        "agent_invoked",
        {"task": "ISO 26262 evidence + ASIL classification", "input": {"file_path": file_path, "asil_hint": asil_hint}},
    )

    started = time.time()
    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT,
        tools=[requirement_lookup, coverage_query, code_interpreter, a2a_quality],
    )

    user_msg = (
        f"Construct the ISO 26262 safety evidence for this file.\n\n"
        f"File: {file_path}\n"
        f"Target ASIL hint from safety case: {asil_hint}\n\n"
        f"```\n{file_content[:8000]}\n```\n\n"
        "Return the JSON object as specified. Re-classify the ASIL if the code "
        "warrants it; document the rationale."
    )

    try:
        result = agent(user_msg)
        try:
            output = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            output = {"asil_level": asil_hint, "evidence_chain": [], "summary": {"raw": str(result.message)}}

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
