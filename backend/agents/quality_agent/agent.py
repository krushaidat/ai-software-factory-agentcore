"""Quality Agent — MISRA / AUTOSAR / HIS-metrics static analyser.

Runs as an AgentCore Runtime container. Tools call out to the AgentCore
Gateway (for the misra_checker MCP target) and the AgentCore Code Interpreter
(for live AST-based metric computation).
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


AGENT_NAME = "quality_agent"
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
    """Invoke a tool via AgentCore Gateway (MCP server backed)."""
    gateway_url = os.environ["GATEWAY_URL"]
    tool_call_id = f"tc-{uuid.uuid4().hex[:10]}"
    started = time.time()

    _emit(
        "tool_call",
        {"tool_name": target, "via": "agentcore_gateway", "params": params, "tool_call_id": tool_call_id},
    )

    # In production this is an MCP call over the Gateway; we use boto3 here.
    response = _agentcore.invoke_gateway_target(
        gatewayUrl=gateway_url,
        targetName=target,
        body=json.dumps(params).encode(),
    )
    body = json.loads(response["body"].read())

    _emit(
        "tool_result",
        {
            "tool_call_id": tool_call_id,
            "result": body,
            "duration_ms": int((time.time() - started) * 1000),
            "error": None,
        },
    )
    return body


@tool
def misra_checker(file_content: str, ruleset: str = "MISRA-C-2012") -> dict:
    """Run MISRA / AUTOSAR static analysis via AgentCore Gateway.

    Args:
        file_content: Source code to analyse.
        ruleset: One of MISRA-C-2012 | MISRA-CPP-2008 | AUTOSAR-CPP14.
    """
    return _gateway_invoke(
        "misra_checker",
        {"file_content": file_content, "ruleset": ruleset},
    )


@tool
def code_interpreter(code: str) -> dict:
    """Execute Python in the AgentCore Code Interpreter sandbox.

    Use this for HIS metric computation (libclang AST walk) and for any
    custom analysis that goes beyond the misra_checker tool. The sandbox has
    libclang, networkx, and tree-sitter pre-installed.
    """
    started = time.time()
    response = _agentcore.start_code_interpreter_session(
        codeInterpreterId=os.environ["CODE_INTERPRETER_ID"],
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
    duration_ms = int((time.time() - started) * 1000)

    _emit(
        "code_execution",
        {"language": "python", "code": code, "stdout": stdout, "stderr": stderr, "duration_ms": duration_ms},
    )
    return {"stdout": stdout, "stderr": stderr}


@tool
def requirement_lookup(swc_id: str) -> dict:
    """Look up linked AUTOSAR SWC requirements for a given SWC ID."""
    return _gateway_invoke("requirement_lookup", {"swc_id": swc_id})


def main(payload: dict[str, Any]) -> dict[str, Any]:
    file_content = payload["file_content"]
    file_path = payload["file_path"]

    _RUN_CTX["sessionId"] = payload.get("sessionId")
    _RUN_CTX["runId"] = payload.get("runId")
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit("agent_invoked", {"task": "MISRA + HIS analysis", "input": {"file_path": file_path}})

    started = time.time()
    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT,
        tools=[misra_checker, code_interpreter, requirement_lookup],
    )

    ruleset = "AUTOSAR-CPP14" if file_path.endswith((".cpp", ".cxx", ".hpp", ".hxx")) else "MISRA-C-2012"
    user_msg = (
        f"Analyse this file for {ruleset} violations and HIS metric breaches.\n\n"
        f"File: {file_path}\n\n"
        f"```\n{file_content[:8000]}\n```\n\n"
        "Return the JSON object as specified in your instructions."
    )

    try:
        result = agent(user_msg)
        try:
            output = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            output = {"findings": [], "metrics": {}, "summary": {"raw": str(result.message)}}

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
