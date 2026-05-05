"""
Shared AgentCore Runtime entrypoint template.

Each agent directory (supervisor + 6 specialists) has its own copy of this file
named `runtime_entrypoint.py` — `deploy_real.py` and the build script copy this
template into each agent dir before `docker build`.

Behavior:
  * Imports `main` from `agent.py` (which is the agent's Strands entrypoint).
  * Wraps `main` in a `BedrockAgentCoreApp` so AgentCore Runtime can POST
    /invocations to it on container port 8080.
  * Normalizes incoming payloads: accepts both camelCase
    (fileContent/fileId) and snake_case (file_content/file_path), accepts a
    JSON-string payload, and tolerates missing optional keys.
  * Returns `{status: ok|error, result?, error?, traceback?}` so the bridge
    Lambda always gets a JSON-deserializable response.
"""
from __future__ import annotations

import json
import logging
import sys
import traceback
from typing import Any

from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Each agent dir has its own agent.py with `def main(payload) -> dict`.
from agent import main as agent_main  # type: ignore

logger = logging.getLogger("agentcore-runtime")
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = BedrockAgentCoreApp()


def _normalize(payload: Any) -> dict[str, Any]:
    """Convert any reasonable input into the canonical dict the agents expect."""
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {"file_content": payload, "file_path": "uploaded.c"}
    if not isinstance(payload, dict):
        payload = {}

    return {
        "file_content": payload.get("file_content") or payload.get("fileContent") or "",
        "file_path": payload.get("file_path") or payload.get("fileId") or "uploaded.c",
        "mode": payload.get("mode", "base"),
        "asil_level": payload.get("asil_level") or payload.get("asilLevel") or "B",
        "findings": payload.get("findings") or [],
        "all_findings": payload.get("all_findings") or payload.get("allFindings") or {},
        "sessionId": payload.get("sessionId"),
        "runId": payload.get("runId"),
        "parentSpanId": payload.get("parentSpanId"),
    }


@app.entrypoint
def handler(event: Any, _context: Any | None = None) -> dict[str, Any]:
    logger.info(
        "agent invocation: %s",
        list(event.keys()) if isinstance(event, dict) else type(event).__name__,
    )
    try:
        normalized = _normalize(event)
        result = agent_main(normalized)
        return {"status": "ok", "result": result}
    except Exception as exc:  # noqa: BLE001 — surface errors as JSON
        logger.exception("agent crashed")
        return {
            "status": "error",
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


if __name__ == "__main__":
    app.run()
