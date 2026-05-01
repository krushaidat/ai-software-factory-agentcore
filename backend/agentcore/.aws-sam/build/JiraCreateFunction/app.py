"""
Mock Jira ticket creator. Persists tickets to DynamoDB and uses an atomic
counter (also in DynamoDB) to allocate per-project ticket numbers. Falls back
to an in-memory counter when DynamoDB is unavailable so the demo keeps
working offline.
"""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover
    boto3 = None  # type: ignore

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass


TICKETS_TABLE = os.environ.get("JIRA_TICKETS_TABLE", "ai-software-factory-jira-prod")
COUNTERS_TABLE = os.environ.get("JIRA_COUNTERS_TABLE", "ai-software-factory-jira-prod-counters")
JIRA_BASE_URL = os.environ.get("JIRA_BASE_URL", "https://jira.example.com")
REGION = os.environ.get("AWS_REGION", "us-east-1")

VALID_PROJECTS = {"BRAKE", "ADAS", "POWERTRAIN", "INFOT", "BODY", "OTA", "DIAG", "SEC"}
VALID_TYPES = {"Bug", "Task", "Story", "Epic", "Spike", "Incident"}
VALID_PRIORITIES = {"Lowest", "Low", "Medium", "High", "Highest", "Blocker"}

_INMEM_LOCK = threading.Lock()
_INMEM_COUNTERS: Dict[str, int] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "title" in event or "description" in event:
        return event
    body = event.get("body")
    if isinstance(body, dict):
        return body
    if isinstance(body, str):
        try:
            return json.loads(body)
        except Exception:
            return {}
    return event


def _next_number_dynamo(project: str) -> int:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    response = client.update_item(
        TableName=COUNTERS_TABLE,
        Key={"project_key": {"S": project}},
        UpdateExpression="ADD seq :one",
        ExpressionAttributeValues={":one": {"N": "1"}},
        ReturnValues="UPDATED_NEW",
    )
    seq = response.get("Attributes", {}).get("seq", {}).get("N")
    if seq is None:
        raise RuntimeError("counter table did not return seq")
    return int(seq)


def _next_number_inmem(project: str, seed: int) -> int:
    with _INMEM_LOCK:
        current = _INMEM_COUNTERS.get(project, seed)
        nxt = current + 1
        _INMEM_COUNTERS[project] = nxt
        return nxt


def _project_seed(project: str) -> int:
    """Stable starting point so demo tickets look plausible."""
    seeds = {
        "BRAKE": 4500,
        "ADAS": 3120,
        "POWERTRAIN": 2780,
        "INFOT": 8810,
        "BODY": 1990,
        "OTA": 660,
        "DIAG": 540,
        "SEC": 305,
    }
    return seeds.get(project, 1000)


def _persist_dynamo(ticket: Dict[str, Any]) -> None:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    item = _marshal(ticket)
    client.put_item(TableName=TICKETS_TABLE, Item=item)


def _marshal(value: Any) -> Any:
    """Convert a Python value into a DynamoDB AttributeValue map. The top-level
    return for a dict is a plain map (suitable for PutItem.Item), while nested
    dicts are wrapped in {"M": ...}. Callers always pass a dict at the root."""
    if isinstance(value, dict):
        return {k: _marshal_value(v) for k, v in value.items()}
    return _marshal_value(value)


def _marshal_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {"M": {k: _marshal_value(v) for k, v in value.items()}}
    if isinstance(value, list):
        return {"L": [_marshal_value(v) for v in value]}
    if isinstance(value, bool):
        return {"BOOL": value}
    if isinstance(value, (int, float)):
        return {"N": str(value)}
    if value is None:
        return {"NULL": True}
    return {"S": str(value)}


def _validate(payload: Dict[str, Any]) -> Optional[str]:
    if not payload.get("title"):
        return "title is required"
    if not payload.get("description"):
        return "description is required"
    project = payload.get("project") or "BRAKE"
    if project not in VALID_PROJECTS:
        return f"project must be one of {sorted(VALID_PROJECTS)}"
    issue_type = payload.get("type") or "Bug"
    if issue_type not in VALID_TYPES:
        return f"type must be one of {sorted(VALID_TYPES)}"
    priority = payload.get("priority") or "Medium"
    if priority not in VALID_PRIORITIES:
        return f"priority must be one of {sorted(VALID_PRIORITIES)}"
    return None


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event or {})

    error = _validate(payload)
    if error:
        return {"created": False, "error": error}

    project = payload.get("project") or "BRAKE"
    issue_type = payload.get("type") or "Bug"
    priority = payload.get("priority") or "Medium"
    labels: List[str] = list(payload.get("labels") or [])
    assignee: Optional[str] = payload.get("assignee")
    reporter: Optional[str] = payload.get("reporter") or "ai-software-factory@bosch.com"

    persistence_source = "dynamodb"
    persistence_error: Optional[str] = None

    try:
        seq = _next_number_dynamo(project)
    except (BotoCoreError, ClientError, RuntimeError) as exc:
        persistence_source = "in-memory"
        persistence_error = f"counter unavailable: {type(exc).__name__}: {exc}"
        seq = _next_number_inmem(project, _project_seed(project))

    ticket_key = f"{project}-{seq}"
    created_at = _now_iso()
    url = f"{JIRA_BASE_URL.rstrip('/')}/browse/{ticket_key}"

    ticket: Dict[str, Any] = {
        "ticket_key": ticket_key,
        "project": project,
        "title": payload["title"],
        "description": payload["description"],
        "type": issue_type,
        "priority": priority,
        "labels": labels,
        "status": "Open",
        "reporter": reporter,
        "assignee": assignee,
        "created_at": created_at,
        "updated_at": created_at,
        "trace_id": str(uuid.uuid4()),
    }

    if persistence_source == "dynamodb":
        try:
            _persist_dynamo(ticket)
        except (BotoCoreError, ClientError, RuntimeError) as exc:
            persistence_source = "in-memory"
            persistence_error = f"put_item failed: {type(exc).__name__}: {exc}"

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "created": True,
        "ticket_key": ticket_key,
        "url": url,
        "created_at": created_at,
        "ticket": ticket,
        "persistence": persistence_source,
        "persistence_error": persistence_error,
        "elapsed_ms": elapsed_ms,
    }


if __name__ == "__main__":  # pragma: no cover
    print(
        json.dumps(
            handler(
                {
                    "title": "MISRA 21.6 violation in CAN_TimeoutHandler",
                    "description": "Detected printf() use in safety-critical path.",
                    "project": "BRAKE",
                    "type": "Bug",
                    "priority": "High",
                    "labels": ["misra", "asil-b"],
                }
            ),
            indent=2,
        )
    )
