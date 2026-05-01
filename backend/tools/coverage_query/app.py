"""
Coverage query tool — returns deterministic mock coverage data for a given
file path. The numbers are derived from a SHA-256 of the file path so the
same file always produces the same report, which keeps the demo coherent
across reruns.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any, Dict, List, Optional

VALID_TYPES = {"line", "branch", "mc_dc", "function", "statement"}
DEFAULT_TYPES = ["line", "branch", "mc_dc"]


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "file_path" in event or "coverage_types" in event:
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


def _seeded_bytes(file_path: str, salt: str) -> int:
    digest = hashlib.sha256(f"{salt}::{file_path}".encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _seeded_float(file_path: str, salt: str, low: float, high: float) -> float:
    """Return a deterministic float in [low, high] derived from file_path."""
    raw = _seeded_bytes(file_path, salt) / float(1 << 64)
    return round(low + raw * (high - low), 1)


def _seeded_int(file_path: str, salt: str, low: int, high: int) -> int:
    raw = _seeded_bytes(file_path, salt)
    span = max(1, high - low + 1)
    return low + int(raw % span)


def _coverage_for(file_path: str, kind: str) -> float:
    """Each coverage type uses a different salt so values aren't correlated."""
    if kind == "line":
        return _seeded_float(file_path, "line", 78.0, 99.0)
    if kind == "branch":
        return _seeded_float(file_path, "branch", 65.0, 95.0)
    if kind == "mc_dc":
        return _seeded_float(file_path, "mc_dc", 55.0, 90.0)
    if kind == "function":
        return _seeded_float(file_path, "function", 80.0, 100.0)
    if kind == "statement":
        return _seeded_float(file_path, "statement", 75.0, 98.0)
    return _seeded_float(file_path, kind, 60.0, 95.0)


def _uncovered_lines(file_path: str, total_lines: int, line_cov: float) -> List[int]:
    """Generate plausible uncovered line numbers in ascending order."""
    miss_count = max(1, int(round(total_lines * (100.0 - line_cov) / 100.0)))
    miss_count = min(miss_count, 12)  # keep payload small
    seed = _seeded_bytes(file_path, "uncovered_lines")
    out: List[int] = []
    cursor = max(5, total_lines // (miss_count + 1))
    for i in range(miss_count):
        # interleave cluster of nearby uncovered lines + a few outliers
        jitter = (seed >> (i * 5)) & 0x1F
        line = cursor * (i + 1) + (jitter % 7) - 3
        line = max(1, min(total_lines, line))
        if line not in out:
            out.append(line)
    out.sort()
    return out


def _estimated_tests(line_cov: float, branch_cov: float, mc_dc_cov: float) -> int:
    """Rough estimate: more uncovered branches => more tests needed."""
    deficit = max(0.0, 100.0 - line_cov) + max(0.0, 100.0 - branch_cov) * 1.5 + max(0.0, 100.0 - mc_dc_cov) * 2.0
    return max(1, int(round(deficit / 8.0)))


def _asil_threshold(file_path: str) -> Dict[str, float]:
    """Return ISO 26262 recommended thresholds based on a heuristic ASIL guess."""
    lower = file_path.lower()
    if "brake" in lower or "steering" in lower or "airbag" in lower:
        return {"asil": "D", "line": 95.0, "branch": 90.0, "mc_dc": 90.0}
    if "adas" in lower or "powertrain" in lower:
        return {"asil": "B", "line": 90.0, "branch": 80.0, "mc_dc": 70.0}
    if "infot" in lower or "telematics" in lower:
        return {"asil": "A", "line": 80.0, "branch": 70.0, "mc_dc": 0.0}
    return {"asil": "QM", "line": 70.0, "branch": 60.0, "mc_dc": 0.0}


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event or {})

    file_path: str = payload.get("file_path") or ""
    requested_types_raw = payload.get("coverage_types") or DEFAULT_TYPES
    if isinstance(requested_types_raw, str):
        requested_types_raw = [requested_types_raw]
    requested_types: List[str] = [t for t in requested_types_raw if t in VALID_TYPES]
    if not requested_types:
        requested_types = list(DEFAULT_TYPES)

    if not file_path:
        return {
            "error": "file_path is required",
            "line_coverage": 0.0,
            "branch_coverage": 0.0,
            "mc_dc_coverage": 0.0,
            "uncovered_lines": [],
            "estimated_tests_needed": 0,
        }

    total_lines = _seeded_int(file_path, "loc", 80, 1200)

    coverage_map: Dict[str, float] = {}
    for kind in requested_types:
        coverage_map[kind] = _coverage_for(file_path, kind)

    line_cov = coverage_map.get("line", _coverage_for(file_path, "line"))
    branch_cov = coverage_map.get("branch", _coverage_for(file_path, "branch"))
    mc_dc_cov = coverage_map.get("mc_dc", _coverage_for(file_path, "mc_dc"))

    uncovered_lines = _uncovered_lines(file_path, total_lines, line_cov)
    estimated_tests = _estimated_tests(line_cov, branch_cov, mc_dc_cov)
    thresholds = _asil_threshold(file_path)

    meets_asil = (
        line_cov >= thresholds["line"]
        and branch_cov >= thresholds["branch"]
        and mc_dc_cov >= thresholds["mc_dc"]
    )

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    response: Dict[str, Any] = {
        "file_path": file_path,
        "loc": total_lines,
        "line_coverage": line_cov,
        "branch_coverage": branch_cov,
        "mc_dc_coverage": mc_dc_cov,
        "coverage": coverage_map,
        "uncovered_lines": uncovered_lines,
        "estimated_tests_needed": estimated_tests,
        "asil_thresholds": thresholds,
        "meets_asil_threshold": meets_asil,
        "report_id": hashlib.sha256(file_path.encode("utf-8")).hexdigest()[:12],
        "generated_at": "deterministic",
        "elapsed_ms": elapsed_ms,
    }
    return response


if __name__ == "__main__":  # pragma: no cover
    print(
        json.dumps(
            handler(
                {
                    "file_path": "src/brake/CAN_TimeoutHandler.c",
                    "coverage_types": ["line", "branch", "mc_dc"],
                }
            ),
            indent=2,
        )
    )
