"""Security Agent — ISO/SAE 21434 TARA + live CVE matching via AgentCore Browser."""

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


AGENT_NAME = "security_agent"
MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
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
def cve_lookup(component: str, version: str) -> dict:
    """Look up CVEs for a component/version via the NVD-mirroring Gateway target."""
    return _gateway_invoke("cve_lookup", {"component": component, "version": version})


@tool
def autosar_spec_fetch(spec_id: str, section: str = "") -> dict:
    """Fetch a section of an AUTOSAR specification via the AgentCore Browser.

    Args:
        spec_id: e.g. "SWS_SecOC", "SWS_Csm", "EXP_SWArchitecture".
        section: optional section anchor (e.g. "8.1.3").

    Returns:
        {"text": "...", "source_url": "https://..."}
    """
    browser_url = f"https://www.autosar.org/specifications/{spec_id}.pdf"
    if section:
        browser_url += f"#section-{section}"

    started = time.time()
    response = _agentcore.invoke_browser_tool(
        browserId=os.environ["BROWSER_ID"],
        action="navigate_and_extract",
        url=browser_url,
        extractionHint=f"Extract section {section}" if section else "Extract first 4000 chars",
    )
    text = response.get("extractedText", "")
    _emit(
        "browser_action",
        {
            "action": "extract",
            "url": browser_url,
            "result_summary": f"Extracted {len(text)} chars from {spec_id}",
            "screenshot_url": response.get("screenshotS3Url"),
        },
    )
    return {"text": text, "source_url": browser_url, "duration_ms": int((time.time() - started) * 1000)}


@tool
def nvd_browse(query: str) -> dict:
    """Browse NVD live for emerging CVEs matching a free-text query.

    Use this when cve_lookup misses zero-day-class advisories — the Gateway
    target uses a daily-refreshed mirror, but Browser hits NVD directly.
    """
    url = f"https://nvd.nist.gov/vuln/search/results?query={query}&form_type=Basic&search_type=all"
    started = time.time()
    response = _agentcore.invoke_browser_tool(
        browserId=os.environ["BROWSER_ID"],
        action="navigate_and_extract",
        url=url,
        extractionHint="Extract the top 10 CVE IDs, descriptions, and CVSS v3.1 base scores.",
    )
    summary = response.get("extractedText", "")
    _emit(
        "browser_action",
        {
            "action": "navigate",
            "url": url,
            "result_summary": f"Searched NVD for '{query}'; matched {summary.count('CVE-')} CVEs",
            "screenshot_url": response.get("screenshotS3Url"),
        },
    )
    return {"results": summary, "duration_ms": int((time.time() - started) * 1000)}


@tool
def code_interpreter(code: str) -> dict:
    """Execute Python in the Code Interpreter sandbox.

    Pre-installed: bandit, semgrep, cryptography, pycryptodome, pyelftools
    (for ELF section permission checks).
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

    _RUN_CTX["sessionId"] = payload.get("sessionId")
    _RUN_CTX["runId"] = payload.get("runId")
    _RUN_CTX["spanId"] = uuid.uuid4().hex[:16]
    _RUN_CTX["parentSpanId"] = payload.get("parentSpanId")

    _emit(
        "agent_invoked",
        {"task": "ISO/SAE 21434 TARA + CVE scan", "input": {"file_path": file_path}},
    )

    started = time.time()
    agent = Agent(
        model=BedrockModel(model_id=MODEL_ID, streaming=True),
        system_prompt=SYSTEM_PROMPT,
        tools=[cve_lookup, autosar_spec_fetch, nvd_browse, code_interpreter],
    )

    user_msg = (
        f"Perform a TARA per ISO/SAE 21434 for this file, including a live CVE check.\n\n"
        f"File: {file_path}\n\n"
        f"```\n{file_content[:8000]}\n```\n\n"
        "Return the JSON object as specified."
    )

    try:
        result = agent(user_msg)
        try:
            output = json.loads(result.message)
        except (json.JSONDecodeError, TypeError):
            output = {"tara": {}, "cves": [], "code_findings": [], "summary": {"raw": str(result.message)}}

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
