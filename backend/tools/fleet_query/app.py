"""
Fleet query tool — returns matching test environments (VEW / HIL / SIL / Fleet)
from the DynamoDB-backed fleet inventory. Falls back to a hard-coded inventory
mirroring src/data/testEnvs.ts when the table is unavailable.
"""
from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List, Optional

try:  # boto3 is provided by the Lambda runtime
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover — local dev without boto3
    boto3 = None  # type: ignore

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass


TABLE_NAME = os.environ.get("FLEET_TABLE_NAME", "ai-software-factory-fleet-prod")
REGION = os.environ.get("AWS_REGION", "us-east-1")

# Mirrors src/data/testEnvs.ts so the demo stays in sync if DynamoDB is empty.
_FALLBACK_FLEET: List[Dict[str, Any]] = [
    {
        "id": "VEW-001",
        "type": "VEW",
        "status": "available",
        "capabilities": ["CAN bus simulation", "Brake model", "Sensor injection"],
        "hw_revision": "R3.2",
        "fw_version": "v3.4.1",
        "queue_depth": 0,
        "asil_capable": "B",
        "location": "Stuttgart",
        "last_heartbeat": "2026-04-30T08:14:00Z",
    },
    {
        "id": "VEW-002",
        "type": "VEW",
        "status": "available",
        "capabilities": ["CAN bus simulation", "Brake model"],
        "hw_revision": "R3.2",
        "fw_version": "v3.4.1",
        "queue_depth": 2,
        "asil_capable": "B",
        "location": "Stuttgart",
        "last_heartbeat": "2026-04-30T08:14:30Z",
    },
    {
        "id": "HIL-003",
        "type": "HIL",
        "status": "available",
        "capabilities": [
            "CAN bus simulation",
            "Brake actuator",
            "Sensor injection",
            "Power supply cycling",
        ],
        "hw_revision": "R4.0",
        "fw_version": "v3.4.0",
        "queue_depth": 1,
        "asil_capable": "D",
        "location": "Stuttgart",
        "last_heartbeat": "2026-04-30T08:13:45Z",
    },
    {
        "id": "HIL-004",
        "type": "HIL",
        "status": "maintenance",
        "capabilities": ["CAN bus simulation", "Brake actuator", "Sensor injection"],
        "hw_revision": "R3.8",
        "fw_version": "v3.3.2",
        "queue_depth": 0,
        "asil_capable": "D",
        "location": "Renningen",
        "last_heartbeat": "2026-04-29T17:02:11Z",
    },
    {
        "id": "SIL-010",
        "type": "SIL",
        "status": "available",
        "capabilities": ["CAN bus simulation", "Virtual brake model"],
        "hw_revision": "N/A",
        "fw_version": "v3.4.1",
        "queue_depth": 0,
        "asil_capable": "A",
        "location": "cloud-eu-west-1",
        "last_heartbeat": "2026-04-30T08:14:55Z",
    },
    {
        "id": "FLEET-T01",
        "type": "Fleet",
        "status": "available",
        "capabilities": ["Full vehicle CAN", "Real brake system", "GPS + IMU"],
        "hw_revision": "Production",
        "fw_version": "v3.4.0",
        "queue_depth": 3,
        "asil_capable": "D",
        "location": "Boxberg proving ground",
        "last_heartbeat": "2026-04-30T08:11:18Z",
    },
    {
        "id": "HIL-005",
        "type": "HIL",
        "status": "available",
        "capabilities": ["CAN-FD", "FlexRay", "Brake actuator", "Steering torque rig"],
        "hw_revision": "R4.1",
        "fw_version": "v3.4.1",
        "queue_depth": 0,
        "asil_capable": "D",
        "location": "Renningen",
        "last_heartbeat": "2026-04-30T08:14:02Z",
    },
    {
        "id": "VEW-003",
        "type": "VEW",
        "status": "available",
        "capabilities": ["Ethernet/SOME-IP", "ADAS sensor injection", "CAN bus simulation"],
        "hw_revision": "R3.3",
        "fw_version": "v3.4.1",
        "queue_depth": 1,
        "asil_capable": "B",
        "location": "Plovdiv",
        "last_heartbeat": "2026-04-30T08:14:45Z",
    },
]


_ASIL_ORDER = {"QM": 0, "A": 1, "B": 2, "C": 3, "D": 4}


def _asil_satisfies(env_asil: str, requested: str) -> bool:
    return _ASIL_ORDER.get(env_asil.upper(), -1) >= _ASIL_ORDER.get(requested.upper(), -1)


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "filter" in event or "limit" in event:
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


def _fetch_from_dynamo() -> List[Dict[str, Any]]:
    if boto3 is None:
        raise RuntimeError("boto3 unavailable")
    client = boto3.client("dynamodb", region_name=REGION)
    paginator = client.get_paginator("scan")
    items: List[Dict[str, Any]] = []
    for page in paginator.paginate(TableName=TABLE_NAME, ConsistentRead=False):
        items.extend(_unmarshal(item) for item in page.get("Items", []))
    return items


def _unmarshal(item: Dict[str, Any]) -> Dict[str, Any]:
    """Tiny DynamoDB AttributeValue unmarshaller (avoids requiring boto3.dynamodb.types)."""
    out: Dict[str, Any] = {}
    for key, value in item.items():
        out[key] = _unmarshal_value(value)
    return out


def _unmarshal_value(value: Dict[str, Any]) -> Any:
    if "S" in value:
        return value["S"]
    if "N" in value:
        try:
            num = float(value["N"])
            return int(num) if num.is_integer() else num
        except ValueError:
            return value["N"]
    if "BOOL" in value:
        return bool(value["BOOL"])
    if "NULL" in value:
        return None
    if "L" in value:
        return [_unmarshal_value(v) for v in value["L"]]
    if "M" in value:
        return {k: _unmarshal_value(v) for k, v in value["M"].items()}
    if "SS" in value:
        return list(value["SS"])
    if "NS" in value:
        return [float(n) for n in value["NS"]]
    return value


def _matches(env: Dict[str, Any], filt: Dict[str, Any]) -> bool:
    if not filt:
        return True
    env_type = filt.get("type")
    if env_type and env.get("type") != env_type:
        return False
    available = filt.get("available")
    if available is True and env.get("status") != "available":
        return False
    asil_req = filt.get("asil_capable")
    if asil_req and not _asil_satisfies(str(env.get("asil_capable", "")), str(asil_req)):
        return False
    capability = filt.get("capability")
    if capability:
        caps = [c.lower() for c in env.get("capabilities", [])]
        if isinstance(capability, str):
            if capability.lower() not in caps:
                return False
        elif isinstance(capability, list):
            for needed in capability:
                if str(needed).lower() not in caps:
                    return False
    fw = filt.get("fw_version")
    if fw and env.get("fw_version") != fw:
        return False
    location = filt.get("location")
    if location and location.lower() not in str(env.get("location", "")).lower():
        return False
    max_queue = filt.get("max_queue_depth")
    if max_queue is not None and env.get("queue_depth", 0) > int(max_queue):
        return False
    return True


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event or {})
    filt: Dict[str, Any] = payload.get("filter") or {}
    limit = int(payload.get("limit") or 25)

    source = "dynamodb"
    fallback_reason: Optional[str] = None
    fleet: List[Dict[str, Any]] = []
    db_elapsed_ms = 0

    db_started = time.perf_counter()
    try:
        fleet = _fetch_from_dynamo()
        if not fleet:
            source = "fallback"
            fallback_reason = f"table {TABLE_NAME} returned 0 items"
            fleet = list(_FALLBACK_FLEET)
    except (BotoCoreError, ClientError) as exc:
        source = "fallback"
        fallback_reason = f"DynamoDB error: {type(exc).__name__}: {exc}"
        fleet = list(_FALLBACK_FLEET)
    except Exception as exc:  # noqa: BLE001
        source = "fallback"
        fallback_reason = f"{type(exc).__name__}: {exc}"
        fleet = list(_FALLBACK_FLEET)
    finally:
        db_elapsed_ms = int((time.perf_counter() - db_started) * 1000)

    matched = [env for env in fleet if _matches(env, filt)]
    matched.sort(key=lambda e: (e.get("queue_depth", 999), e.get("id", "")))
    matched = matched[:limit]

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "environments": matched,
        "total_in_inventory": len(fleet),
        "matched_count": len(matched),
        "filter_applied": filt,
        "source": source,
        "fallback_reason": fallback_reason,
        "latency_ms": {"dynamodb": db_elapsed_ms, "total": elapsed_ms},
    }


if __name__ == "__main__":  # pragma: no cover
    print(
        json.dumps(
            handler({"filter": {"type": "HIL", "available": True, "asil_capable": "B"}}),
            indent=2,
        )
    )
