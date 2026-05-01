"""AgentCore Bridge Lambda.

Receives WebSocket messages with action `pipeline_start` or `agent_chat`
(routed via the websocket-message Lambda using async invoke), looks up the
AgentCore Supervisor Runtime ARN, invokes it asynchronously with
`bedrock-agentcore.invoke_agent_runtime`, and stores the runId mapping in
the `pipeline-runs` DynamoDB table so the trace-streamer Lambda can fan the
agent events back to the correct WebSocket connection.

Event shape (the websocket-message Lambda always wraps the original WS body
under `body`, but we also accept a flat shape for direct invocation):

    {
      "connectionId": "...",
      "body": {
        "action": "pipeline_start" | "agent_chat",
        "sessionId": "...",
        "userId": "<cognito email>",
        "payload": { "fileId": "...", "fileContent": "...", "mode": "...",
                     "message": "..." }
      },
      "requestContext": { ... }
    }

Environment variables expected:
    SUPERVISOR_RUNTIME_ARN
    PIPELINE_RUNS_TABLE
    WEBSOCKET_API_ENDPOINT
    DEMO_CORPUS_PATH        (default: /var/task/demo_corpus)
"""

from __future__ import annotations

import json
import os
import time
import traceback
import uuid
from decimal import Decimal
from typing import Any

import boto3

from utils.dynamodb import pipeline_runs_table
from utils.websocket import send_to_connection


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

_AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
_agentcore = boto3.client("bedrock-agentcore", region_name=_AWS_REGION)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())


def _to_ddb_safe(value: Any) -> Any:
    """Recursively convert floats to Decimal for DynamoDB."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_ddb_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_ddb_safe(v) for v in value]
    return value


def _load_file_content(file_id: str) -> str:
    """Load a file from the bundled demo_corpus directory."""
    base = os.environ.get("DEMO_CORPUS_PATH", "/var/task/demo_corpus")
    # Defend against path-traversal — file_id is bundled content but still
    # resolve against the base directory and ensure it stays inside.
    full_path = os.path.normpath(os.path.join(base, file_id))
    if not full_path.startswith(os.path.normpath(base)):
        raise ValueError(f"Invalid fileId path: {file_id}")
    with open(full_path, "r", encoding="utf-8") as fh:
        return fh.read()


def _persist_run(
    session_id: str,
    run_id: str,
    status: str,
    connection_id: str,
    payload: dict[str, Any],
) -> None:
    """Persist the master run record. SK 'run' marks the root item."""
    item = {
        "sessionId": session_id,
        "runId": run_id,                      # primary sort key in pipeline-runs
        "sk": "run",                          # logical row type marker
        "status": status,
        "connectionId": connection_id,
        "startedAt": _now_iso(),
        "payload": _to_ddb_safe(payload),
        "ttl": int(time.time()) + 86400,
    }
    pipeline_runs_table().put_item(Item=item)


def _mark_failed(session_id: str, run_id: str, error: str) -> None:
    try:
        pipeline_runs_table().update_item(
            Key={"sessionId": session_id, "runId": run_id},
            UpdateExpression="SET #s = :s, #e = :e, failedAt = :t",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={
                ":s": "failed",
                ":e": error[:1024],
                ":t": _now_iso(),
            },
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[agentcore-bridge] failed to mark run failed: {exc}")


# ---------------------------------------------------------------------------
# Lambda entry point
# ---------------------------------------------------------------------------


def handler(event, context):
    """Sync handler — invoked async by the websocket-message router."""
    print(f"[agentcore-bridge] event: {json.dumps(event)[:1024]}")

    # The websocket-message router wraps the original WS body under `body`
    # and surfaces `connectionId` at the top level. Support a flat invocation
    # shape too for tests.
    connection_id = event.get("connectionId") or event.get("requestContext", {}).get(
        "connectionId", ""
    )
    body = event.get("body") if isinstance(event.get("body"), dict) else event

    action = body.get("action") or "pipeline_start"
    session_id = body.get("sessionId", "")
    user_id = body.get("userId") or body.get("user", "")
    payload = body.get("payload") or {}

    # Accept payload fields at the top level too (tolerant of slightly
    # different client shapes).
    file_id = payload.get("fileId") or body.get("fileId", "")
    file_content = payload.get("fileContent") or body.get("fileContent", "")
    mode = payload.get("mode") or body.get("mode", "base")
    message = payload.get("message") or body.get("message", "")

    if not session_id:
        print("[agentcore-bridge] missing sessionId — aborting")
        if connection_id:
            send_to_connection(
                connection_id,
                {
                    "type": "pipeline_failed",
                    "timestamp": _now_iso(),
                    "payload": {"error": "Missing sessionId"},
                },
            )
        return {"statusCode": 400, "error": "missing sessionId"}

    run_id = f"run-{uuid.uuid4().hex[:12]}"

    # Resolve file content for pipeline_start if only fileId was supplied.
    if action == "pipeline_start" and file_id and not file_content:
        try:
            file_content = _load_file_content(file_id)
            print(
                f"[agentcore-bridge] loaded {len(file_content)} chars from "
                f"demo_corpus/{file_id}"
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[agentcore-bridge] failed to load fileId={file_id}: {exc}")
            send_to_connection(
                connection_id,
                {
                    "type": "pipeline_failed",
                    "timestamp": _now_iso(),
                    "sessionId": session_id,
                    "runId": run_id,
                    "payload": {"error": f"Failed to load file: {file_id}"},
                },
            )
            return {"statusCode": 404, "error": "file not found"}

    # 1. Persist the run record first so the trace streamer can resolve the
    #    connectionId as soon as the supervisor starts emitting events.
    persist_payload = {
        "action": action,
        "fileId": file_id,
        "mode": mode,
        "userId": user_id,
        "message": message,
    }
    try:
        _persist_run(session_id, run_id, "started", connection_id, persist_payload)
    except Exception as exc:  # noqa: BLE001
        print(f"[agentcore-bridge] DDB persist failed: {traceback.format_exc()}")
        send_to_connection(
            connection_id,
            {
                "type": "pipeline_failed",
                "timestamp": _now_iso(),
                "sessionId": session_id,
                "runId": run_id,
                "payload": {"error": f"Failed to persist run: {exc}"},
            },
        )
        return {"statusCode": 500, "error": "ddb persist failed"}

    # 2. Notify the WebSocket client that the run has been accepted. This
    #    matches the CONTRACTS.md `pipeline_started` envelope.
    send_to_connection(
        connection_id,
        {
            "type": "pipeline_started",
            "timestamp": _now_iso(),
            "sessionId": session_id,
            "runId": run_id,
            "agentName": "supervisor",
            "spanId": None,
            "parentSpanId": None,
            "payload": {
                "fileId": file_id,
                "mode": mode,
                "action": action,
            },
        },
    )

    # 3. Invoke the supervisor AgentCore Runtime asynchronously. The actual
    #    progress events flow back via EventBridge -> trace-streamer.
    runtime_arn = os.environ.get("SUPERVISOR_RUNTIME_ARN")
    if not runtime_arn:
        err = "SUPERVISOR_RUNTIME_ARN not configured"
        print(f"[agentcore-bridge] {err}")
        _mark_failed(session_id, run_id, err)
        send_to_connection(
            connection_id,
            {
                "type": "pipeline_failed",
                "timestamp": _now_iso(),
                "sessionId": session_id,
                "runId": run_id,
                "payload": {"error": err},
            },
        )
        return {"statusCode": 500, "error": err}

    invoke_payload = {
        "sessionId": session_id,
        "runId": run_id,
        "connectionId": connection_id,
        "userId": user_id,
        "fileContent": file_content,
        "fileId": file_id,
        "file_path": file_id,        # supervisor uses both keys
        "file_content": file_content,
        "mode": mode,
        "message": message,
        "action": action,
    }

    try:
        _agentcore.invoke_agent_runtime(
            agentRuntimeArn=runtime_arn,
            qualifier="DEFAULT",
            runtimeSessionId=f"{session_id}-{run_id}",
            payload=json.dumps(invoke_payload).encode("utf-8"),
        )
        print(
            f"[agentcore-bridge] supervisor invoked: sessionId={session_id} "
            f"runId={run_id} mode={mode}"
        )
    except Exception as exc:  # noqa: BLE001
        print(
            f"[agentcore-bridge] invoke_agent_runtime failed: "
            f"{traceback.format_exc()}"
        )
        _mark_failed(session_id, run_id, str(exc))
        send_to_connection(
            connection_id,
            {
                "type": "pipeline_failed",
                "timestamp": _now_iso(),
                "sessionId": session_id,
                "runId": run_id,
                "payload": {"error": f"Failed to invoke supervisor: {exc}"},
            },
        )
        return {"statusCode": 500, "error": "invoke failed"}

    return {
        "statusCode": 200,
        "sessionId": session_id,
        "runId": run_id,
    }
