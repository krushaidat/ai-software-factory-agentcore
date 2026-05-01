"""Trace Streamer Lambda.

Triggered by EventBridge events emitted by the AgentCore Supervisor and
specialist agents (Source = `ai-software-factory.agents`). For each event
this Lambda:

  1. Resolves the WebSocket connectionId from the `pipeline-runs` DynamoDB
     table using `(sessionId, runId)`.
  2. Forwards the event JSON to the connection via the API Gateway
     Management API (using the existing `utils.websocket.send_to_connection`
     helper).
  3. Persists the event to `pipeline-runs` (one item per event with
     `SK = event#<timestamp>#<spanId>`) for replay support.
  4. Maintains running totals (token usage, duration, cost) on the run
     record. On `pipeline_completed`/`pipeline_failed` the run is closed
     out with a final status and computed cost.
  5. Cleans up stale connections (GoneException) by removing them from the
     connections table.

Event envelope (matches backend/agents/CONTRACTS.md):

    {
      "type": "agent_thinking" | "agent_invoked" | ...,
      "timestamp": "...",
      "sessionId": "...",
      "runId": "...",
      "agentName": "...",
      "spanId": "...",
      "parentSpanId": "...",
      "payload": { ... }
    }

EventBridge wraps it under `detail`. This handler accepts both the EB shape
(single event with `detail`) and SQS-style batches with `Records`.

Environment variables expected:
    PIPELINE_RUNS_TABLE
    CONNECTIONS_TABLE
    WEBSOCKET_API_ENDPOINT
"""

from __future__ import annotations

import json
import os
import time
import traceback
from decimal import Decimal
from typing import Any, Iterable

import boto3
from botocore.exceptions import ClientError

from utils.dynamodb import pipeline_runs_table, remove_connection
from utils.websocket import get_apigw_client


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


def _iter_events(event: dict) -> Iterable[dict]:
    """Yield event-detail dicts from any supported invocation shape."""
    # 1. Single EventBridge event.
    if isinstance(event, dict) and "detail" in event:
        detail = event["detail"]
        if isinstance(detail, str):
            try:
                detail = json.loads(detail)
            except json.JSONDecodeError:
                return
        if isinstance(detail, dict):
            yield detail
        return

    # 2. EventBridge Pipes / SQS / batch wrapper.
    records = event.get("Records") if isinstance(event, dict) else None
    if records:
        for rec in records:
            body = rec.get("body") or rec.get("Body") or rec.get("detail") or rec
            if isinstance(body, str):
                try:
                    body = json.loads(body)
                except json.JSONDecodeError:
                    continue
            if isinstance(body, dict):
                # SQS-from-EventBridge messages have the EB envelope inside body.
                if "detail" in body and isinstance(body["detail"], dict):
                    yield body["detail"]
                else:
                    yield body
        return

    # 3. Direct invocation with the envelope already on the top level.
    if isinstance(event, dict) and "type" in event and "sessionId" in event:
        yield event


# ---------------------------------------------------------------------------
# DynamoDB access
# ---------------------------------------------------------------------------


def _get_run_record(session_id: str, run_id: str) -> dict | None:
    try:
        resp = pipeline_runs_table().get_item(
            Key={"sessionId": session_id, "runId": run_id}
        )
        return resp.get("Item")
    except Exception as exc:  # noqa: BLE001
        print(f"[trace-streamer] DDB get_item failed: {exc}")
        return None


def _persist_event(session_id: str, run_id: str, envelope: dict) -> None:
    """Store one event item for replay. Composite key keeps run + events
    co-located under the same `sessionId` partition."""
    timestamp = envelope.get("timestamp") or _now_iso()
    span_id = envelope.get("spanId") or "nospan"
    item = {
        "sessionId": session_id,
        "runId": f"{run_id}#event#{timestamp}#{span_id}",
        "sk": f"event#{timestamp}#{span_id}",
        "parentRunId": run_id,
        "type": envelope.get("type"),
        "agentName": envelope.get("agentName"),
        "timestamp": timestamp,
        "spanId": span_id,
        "parentSpanId": envelope.get("parentSpanId"),
        "payload": _to_ddb_safe(envelope.get("payload") or {}),
        "ttl": int(time.time()) + 86400,
    }
    try:
        pipeline_runs_table().put_item(Item=item)
    except Exception as exc:  # noqa: BLE001
        print(f"[trace-streamer] DDB put_item (event) failed: {exc}")


def _accumulate_totals(session_id: str, run_id: str, envelope: dict) -> None:
    """Accumulate running totals (tokens / duration) on the run record."""
    payload = envelope.get("payload") or {}
    event_type = envelope.get("type")

    add_expressions: list[str] = []
    add_values: dict[str, Any] = {}

    if event_type == "agent_completed":
        tokens_in = int(payload.get("tokens_in") or 0)
        tokens_out = int(payload.get("tokens_out") or 0)
        if tokens_in:
            add_expressions.append("totalTokensIn :ti")
            add_values[":ti"] = tokens_in
        if tokens_out:
            add_expressions.append("totalTokensOut :to")
            add_values[":to"] = tokens_out

    if not add_expressions:
        return

    try:
        pipeline_runs_table().update_item(
            Key={"sessionId": session_id, "runId": run_id},
            UpdateExpression="ADD " + ", ".join(add_expressions),
            ExpressionAttributeValues=add_values,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[trace-streamer] DDB update_item (totals) failed: {exc}")


def _close_out_run(
    session_id: str,
    run_id: str,
    envelope: dict,
    final_status: str,
) -> None:
    """Mark the run as completed/failed and stamp final cost."""
    payload = envelope.get("payload") or {}
    duration_ms = int(payload.get("duration_ms") or 0)
    total_tokens = int(payload.get("totalTokens") or 0)
    total_cost = payload.get("totalCost")

    set_parts = ["#s = :s", "completedAt = :t"]
    names = {"#s": "status"}
    values: dict[str, Any] = {
        ":s": final_status,
        ":t": _now_iso(),
    }
    if duration_ms:
        set_parts.append("durationMs = :d")
        values[":d"] = duration_ms
    if total_tokens:
        set_parts.append("totalTokens = :tt")
        values[":tt"] = total_tokens
    if total_cost is not None:
        set_parts.append("totalCost = :tc")
        values[":tc"] = _to_ddb_safe(total_cost)
    if "agentsInvoked" in payload:
        set_parts.append("agentsInvoked = :ai")
        values[":ai"] = _to_ddb_safe(payload["agentsInvoked"])
    if final_status == "failed" and "error" in payload:
        set_parts.append("#e = :err")
        names["#e"] = "error"
        values[":err"] = str(payload["error"])[:1024]

    try:
        pipeline_runs_table().update_item(
            Key={"sessionId": session_id, "runId": run_id},
            UpdateExpression="SET " + ", ".join(set_parts),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[trace-streamer] DDB update_item (close) failed: {exc}")


# ---------------------------------------------------------------------------
# WebSocket forwarding
# ---------------------------------------------------------------------------


def _forward_to_connection(connection_id: str, envelope: dict) -> bool:
    """Push the event JSON to the WebSocket. Returns False if the connection
    is gone (and the connection has been removed)."""
    if not connection_id:
        return False
    client = get_apigw_client()
    try:
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(envelope, default=str).encode("utf-8"),
        )
        return True
    except client.exceptions.GoneException:
        print(f"[trace-streamer] connection gone: {connection_id}")
        try:
            remove_connection(connection_id)
        except Exception as exc:  # noqa: BLE001
            print(f"[trace-streamer] remove_connection failed: {exc}")
        return False
    except ClientError as exc:
        # boto3 retries throttles internally; surface the rest as warnings
        # so we do not poison the EventBridge target with retries on
        # non-retryable errors.
        code = exc.response.get("Error", {}).get("Code")
        print(f"[trace-streamer] post_to_connection failed ({code}): {exc}")
        return False


# ---------------------------------------------------------------------------
# Lambda entry point
# ---------------------------------------------------------------------------


def handler(event, context):
    print(f"[trace-streamer] event: {json.dumps(event, default=str)[:1024]}")

    processed = 0
    for envelope in _iter_events(event):
        try:
            _process_one(envelope)
            processed += 1
        except Exception:  # noqa: BLE001
            print(
                f"[trace-streamer] error processing event: "
                f"{traceback.format_exc()}"
            )
    return {"statusCode": 200, "processed": processed}


def _process_one(envelope: dict) -> None:
    session_id = envelope.get("sessionId")
    run_id = envelope.get("runId")
    event_type = envelope.get("type")

    if not session_id or not run_id or not event_type:
        print(f"[trace-streamer] missing keys, skipping: {envelope}")
        return

    # 1. Resolve connection from the run record.
    run_record = _get_run_record(session_id, run_id)
    connection_id = run_record.get("connectionId") if run_record else None

    # 2. Forward to WebSocket. Even if we can't, we still persist for replay.
    if connection_id:
        _forward_to_connection(connection_id, envelope)
    else:
        print(
            f"[trace-streamer] no connectionId for sessionId={session_id} "
            f"runId={run_id}; persisting only"
        )

    # 3. Persist the event for replay.
    _persist_event(session_id, run_id, envelope)

    # 4. Update running totals.
    _accumulate_totals(session_id, run_id, envelope)

    # 5. Close out lifecycle events.
    if event_type == "pipeline_completed":
        _close_out_run(session_id, run_id, envelope, "completed")
    elif event_type == "pipeline_failed":
        _close_out_run(session_id, run_id, envelope, "failed")
