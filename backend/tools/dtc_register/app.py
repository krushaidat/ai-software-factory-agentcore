"""
Diagnostic Trouble Code (DTC) registration tool. Mints a per-ECU DTC id,
maps the human-readable code to a plausible OBD-II / UDS code and stores
the registration in DynamoDB. Detects duplicates by (dtc_code, ecu) and
returns the existing record instead of creating a second one.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover
    boto3 = None  # type: ignore

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass


DTC_TABLE = os.environ.get("DTC_TABLE_NAME", "ai-software-factory-dtc-prod")
REGION = os.environ.get("AWS_REGION", "us-east-1")

VALID_ECUS = {
    "brake": "BRAKE",
    "adas": "ADAS",
    "powertrain": "PWRT",
    "body": "BODY",
    "infotainment": "INFO",
    "telematics": "TELE",
    "gateway": "GWAY",
    "steering": "STEER",
}
VALID_SEVERITIES = {"info", "warning", "critical"}

_OBD2_PREFIX_BY_ECU = {
    "brake": "C",      # Chassis
    "adas": "C",
    "steering": "C",
    "powertrain": "P",  # Powertrain
    "body": "B",
    "infotainment": "U",
    "telematics": "U",
    "gateway": "U",
}

_INMEM_LOCK = threading.Lock()
_INMEM_COUNTERS: Dict[str, int] = {}
_INMEM_INDEX: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "dtc_code" in event:
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


def _obd2_for(dtc_code: str, ecu: str) -> str:
    """Map a textual DTC name to a deterministic OBD-II / UDS code.

    The format is <PrefixLetter><4 hex digits>. The prefix is chosen by ECU
    (P/C/B/U) and the trailing 4 hex digits come from a SHA-1 hash of the
    code so the mapping is stable across calls.
    """
    prefix = _OBD2_PREFIX_BY_ECU.get(ecu.lower(), "U")
    digest = hashlib.sha1(f"{ecu}:{dtc_code}".encode("utf-8")).hexdigest()
    return f"{prefix}{digest[:4].upper()}"


def _ecu_key(ecu: str) -> str:
    return VALID_ECUS.get(ecu.lower(), ecu.upper()[:5])


def _seed_for(ecu: str) -> int:
    return {
        "brake": 4500,
        "adas": 3100,
        "powertrain": 2700,
        "body": 1900,
        "infotainment": 8800,
        "telematics": 6200,
        "gateway": 5400,
        "steering": 7100,
    }.get(ecu.lower(), 1000)


def _validate(payload: Dict[str, Any]) -> Optional[str]:
    if not payload.get("dtc_code"):
        return "dtc_code is required"
    if not payload.get("ecu"):
        return "ecu is required"
    if payload["ecu"].lower() not in VALID_ECUS:
        return f"ecu must be one of {sorted(VALID_ECUS)}"
    sev = (payload.get("severity") or "warning").lower()
    if sev not in VALID_SEVERITIES:
        return f"severity must be one of {sorted(VALID_SEVERITIES)}"
    return None


def _find_existing_dynamo(dtc_code: str, ecu: str) -> Optional[Dict[str, Any]]:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    try:
        response = client.query(
            TableName=DTC_TABLE,
            IndexName="dtc-code-ecu-index",
            KeyConditionExpression="dtc_code = :c AND ecu = :e",
            ExpressionAttributeValues={
                ":c": {"S": dtc_code},
                ":e": {"S": ecu},
            },
            Limit=1,
        )
    except ClientError as exc:
        # If the GSI doesn't exist, fall back to a small scan.
        if exc.response.get("Error", {}).get("Code") == "ValidationException":
            response = client.scan(
                TableName=DTC_TABLE,
                FilterExpression="dtc_code = :c AND ecu = :e",
                ExpressionAttributeValues={
                    ":c": {"S": dtc_code},
                    ":e": {"S": ecu},
                },
                Limit=1,
            )
        else:
            raise
    items = response.get("Items") or []
    if not items:
        return None
    return _unmarshal(items[0])


def _next_id_dynamo(ecu_key: str) -> int:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    response = client.update_item(
        TableName=f"{DTC_TABLE}-counters",
        Key={"ecu_key": {"S": ecu_key}},
        UpdateExpression="ADD seq :one",
        ExpressionAttributeValues={":one": {"N": "1"}},
        ReturnValues="UPDATED_NEW",
    )
    seq = response.get("Attributes", {}).get("seq", {}).get("N")
    if seq is None:
        raise RuntimeError("dtc counter table did not return seq")
    return int(seq)


def _persist_dynamo(record: Dict[str, Any]) -> None:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    client.put_item(TableName=DTC_TABLE, Item=_marshal(record))


def _marshal(value: Any) -> Any:
    """Top-level dict -> AttributeValue map; nested values are wrapped properly."""
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


def _unmarshal(item: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in item.items():
        if "S" in value:
            out[key] = value["S"]
        elif "N" in value:
            out[key] = float(value["N"])
        elif "BOOL" in value:
            out[key] = bool(value["BOOL"])
        elif "L" in value:
            out[key] = [v.get("S") or v.get("N") for v in value["L"]]
        else:
            out[key] = value
    return out


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event or {})

    error = _validate(payload)
    if error:
        return {"registered": False, "error": error}

    dtc_code: str = payload["dtc_code"]
    ecu: str = payload["ecu"].lower()
    description: str = payload.get("description") or ""
    severity: str = (payload.get("severity") or "warning").lower()
    ecu_key = _ecu_key(ecu)
    obd2 = _obd2_for(dtc_code, ecu)
    persistence_source = "dynamodb"
    persistence_error: Optional[str] = None

    # Duplicate detection
    existing: Optional[Dict[str, Any]] = None
    try:
        existing = _find_existing_dynamo(dtc_code, ecu)
    except (BotoCoreError, ClientError, RuntimeError) as exc:
        persistence_source = "in-memory"
        persistence_error = f"lookup failed: {type(exc).__name__}: {exc}"
        index_key = f"{ecu}::{dtc_code}"
        with _INMEM_LOCK:
            existing = _INMEM_INDEX.get(index_key)

    if existing:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return {
            "registered": True,
            "duplicate": True,
            "dtc_id": existing.get("dtc_id"),
            "obd2_code": existing.get("obd2_code", obd2),
            "registration_time": existing.get("registration_time"),
            "record": existing,
            "persistence": persistence_source,
            "persistence_error": persistence_error,
            "elapsed_ms": elapsed_ms,
        }

    # Allocate id
    if persistence_source == "dynamodb":
        try:
            seq = _next_id_dynamo(ecu_key)
        except (BotoCoreError, ClientError, RuntimeError) as exc:
            persistence_source = "in-memory"
            persistence_error = f"counter unavailable: {type(exc).__name__}: {exc}"
            seq = _next_id_inmem(ecu)
    else:
        seq = _next_id_inmem(ecu)

    dtc_id = f"{ecu_key}-{seq}"
    registration_time = _now_iso()
    record: Dict[str, Any] = {
        "dtc_id": dtc_id,
        "dtc_code": dtc_code,
        "ecu": ecu,
        "ecu_key": ecu_key,
        "description": description,
        "severity": severity,
        "obd2_code": obd2,
        "registration_time": registration_time,
        "registered_by": payload.get("registered_by") or "ai-software-factory",
    }

    if persistence_source == "dynamodb":
        try:
            _persist_dynamo(record)
        except (BotoCoreError, ClientError, RuntimeError) as exc:
            persistence_source = "in-memory"
            persistence_error = f"put_item failed: {type(exc).__name__}: {exc}"

    if persistence_source == "in-memory":
        with _INMEM_LOCK:
            _INMEM_INDEX[f"{ecu}::{dtc_code}"] = record

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "registered": True,
        "duplicate": False,
        "dtc_id": dtc_id,
        "obd2_code": obd2,
        "registration_time": registration_time,
        "record": record,
        "persistence": persistence_source,
        "persistence_error": persistence_error,
        "elapsed_ms": elapsed_ms,
    }


def _next_id_inmem(ecu: str) -> int:
    with _INMEM_LOCK:
        current = _INMEM_COUNTERS.get(ecu, _seed_for(ecu))
        nxt = current + 1
        _INMEM_COUNTERS[ecu] = nxt
        return nxt


if __name__ == "__main__":  # pragma: no cover
    print(
        json.dumps(
            handler(
                {
                    "dtc_code": "DIAG_CAN_TIMEOUT",
                    "ecu": "brake",
                    "description": "CAN bus timeout in brake controller",
                    "severity": "warning",
                }
            ),
            indent=2,
        )
    )
