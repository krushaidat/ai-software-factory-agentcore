"""
AgentCore Runtime entrypoint for the Supervisor agent.

The agent code (in `agent.py`) exposes a `main(payload) -> dict` function.
This file wraps that function in a `BedrockAgentCoreApp` so AgentCore Runtime
can invoke it via the standard `/invocations` HTTP endpoint.

The container is run as the entrypoint of an AgentCore Runtime — see the
Dockerfile for the CMD that launches this script.
"""
from __future__ import annotations

import json
import logging
import sys
import traceback
from typing import Any

from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Import the agent's main function — note this also registers the @tool
# decorators on the supervisor's tool functions (the import is the side effect).
from agent import main as supervisor_main  # type: ignore

logger = logging.getLogger("supervisor-runtime")
logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = BedrockAgentCoreApp()


def _normalize_payload(payload: Any) -> dict[str, Any]:
    """Accept the WebSocket-bridge or local-test payload shapes and produce
    the canonical dict the agent expects: {file_content, file_path, mode, ...}.
    """
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {"file_content": payload, "file_path": "uploaded.c", "mode": "base"}
    if not isinstance(payload, dict):
        payload = {}

    # The agentcore-bridge Lambda sends both camelCase and snake_case fields.
    # Normalize to snake_case for the agent.
    return {
        "file_content": payload.get("file_content") or payload.get("fileContent") or "",
        "file_path": payload.get("file_path") or payload.get("fileId") or "uploaded.c",
        "mode": payload.get("mode", "base"),
        "sessionId": payload.get("sessionId"),
        "runId": payload.get("runId"),
        "parentSpanId": payload.get("parentSpanId"),
    }


@app.entrypoint
def handler(event: Any, context: Any | None = None) -> dict[str, Any]:
    """AgentCore Runtime invocations land here. Returns a JSON-serializable dict."""
    logger.info("Supervisor invocation received: keys=%s", list(event.keys()) if isinstance(event, dict) else type(event).__name__)
    try:
        normalized = _normalize_payload(event)
        if not normalized["file_content"]:
            return {
                "status": "error",
                "error": "Missing 'file_content' (or 'fileContent') in payload",
                "received_keys": list(event.keys()) if isinstance(event, dict) else None,
            }
        result = supervisor_main(normalized)
        return {"status": "ok", "result": result}
    except Exception as exc:  # noqa: BLE001 — runtime returns the exception detail
        logger.exception("Supervisor handler crashed")
        return {
            "status": "error",
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


if __name__ == "__main__":
    app.run()
