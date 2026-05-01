"""
Knowledge graph query tool — searches an in-memory automotive defect-cluster
graph (12 nodes, 30 edges) keyed on code patterns, defect clusters, ECUs and
mitigation playbooks. Returns matches scored by token overlap and graph
proximity, ordered by descending relevance.
"""
from __future__ import annotations

import json
import math
import re
import time
from collections import defaultdict, deque
from typing import Any, Dict, Iterable, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Graph definition. Hand-crafted to mirror realistic automotive defect data.
# ---------------------------------------------------------------------------

_NODES: List[Dict[str, Any]] = [
    {
        "id": "DC-2025-0847",
        "type": "defect_cluster",
        "label": "RingBuffer_Push unchecked return",
        "summary": "12 PRs across BRAKE/POWERTRAIN ignored RingBuffer_Push() return value, leading to silent message loss under burst CAN load.",
        "tags": ["ringbuffer", "can", "return-ignored", "MISRA-17.7"],
        "weight": 0.94,
    },
    {
        "id": "DC-2025-0612",
        "type": "defect_cluster",
        "label": "CAN frame dropped on transient bus-off",
        "summary": "8 incidents where CAN_BusOffRecovery did not flush the TX queue before re-enabling.",
        "tags": ["can", "bus-off", "tx-queue", "ASIL-B"],
        "weight": 0.81,
    },
    {
        "id": "DC-2024-1190",
        "type": "defect_cluster",
        "label": "Brake hydraulic pressure underflow",
        "summary": "Float subtraction in PressureEstimate produced negative values when sensor noise spiked; triggered fault reaction.",
        "tags": ["brake", "float", "underflow", "sensor"],
        "weight": 0.77,
    },
    {
        "id": "DC-2024-0903",
        "type": "defect_cluster",
        "label": "OTA rollback on CRC mismatch",
        "summary": "Update agent rolled back valid images because CRC32 was computed over zero-padded slot.",
        "tags": ["ota", "crc", "rollback", "secure-boot"],
        "weight": 0.66,
    },
    {
        "id": "PATTERN-001",
        "type": "code_pattern",
        "label": "Unchecked RingBuffer_Push",
        "summary": "Pattern: `RingBuffer_Push(...);` without capturing or testing the return value.",
        "tags": ["ringbuffer", "MISRA-17.7", "return-ignored"],
        "weight": 0.92,
    },
    {
        "id": "PATTERN-014",
        "type": "code_pattern",
        "label": "memcpy with sizeof(pointer)",
        "summary": "memcpy(dst, src, sizeof(src)) where src is a pointer copies only 4/8 bytes.",
        "tags": ["memcpy", "sizeof", "pointer"],
        "weight": 0.71,
    },
    {
        "id": "PATTERN-022",
        "type": "code_pattern",
        "label": "if (x) on non-Boolean",
        "summary": "Controlling expression of `if` is a non-Boolean integer; violates MISRA 14.4.",
        "tags": ["MISRA-14.4", "if", "boolean"],
        "weight": 0.55,
    },
    {
        "id": "ECU-BRAKE",
        "type": "ecu",
        "label": "Brake ECU",
        "summary": "Brake controller running v3.4.x firmware on R3.2/R4.0 hardware.",
        "tags": ["brake", "ASIL-B", "ASIL-D"],
        "weight": 0.50,
    },
    {
        "id": "ECU-POWERTRAIN",
        "type": "ecu",
        "label": "Powertrain ECU",
        "summary": "Engine/transmission control unit; ASIL-B.",
        "tags": ["powertrain", "ASIL-B"],
        "weight": 0.45,
    },
    {
        "id": "PLAYBOOK-PB-019",
        "type": "playbook",
        "label": "Mitigation: capture and assert RingBuffer_Push return",
        "summary": "Wrap calls in `if (RingBuffer_Push(...) != BUFFER_OK) { Diag_Report(...); }` and add a coverage assertion.",
        "tags": ["ringbuffer", "mitigation", "MISRA-17.7"],
        "weight": 0.88,
    },
    {
        "id": "PLAYBOOK-PB-007",
        "type": "playbook",
        "label": "Mitigation: bus-off TX queue flush",
        "summary": "Drain pending frames before clearing the bus-off flag and resume from the application layer.",
        "tags": ["can", "bus-off", "mitigation"],
        "weight": 0.74,
    },
    {
        "id": "REQ-FS-031",
        "type": "requirement",
        "label": "FS-031: CAN message integrity under load",
        "summary": "All CAN frames produced by safety-critical components shall be retried until either ack'd or escalated as a DTC.",
        "tags": ["safety", "can", "ASIL-B", "requirement"],
        "weight": 0.60,
    },
]

# Adjacency list: source -> [(target, edge_type, weight), ...]
_EDGES: Dict[str, List[Tuple[str, str, float]]] = {
    "DC-2025-0847": [
        ("PATTERN-001", "matches_pattern", 0.95),
        ("ECU-BRAKE", "affects_ecu", 0.85),
        ("ECU-POWERTRAIN", "affects_ecu", 0.62),
        ("PLAYBOOK-PB-019", "mitigated_by", 0.91),
        ("REQ-FS-031", "violates_requirement", 0.78),
    ],
    "DC-2025-0612": [
        ("ECU-BRAKE", "affects_ecu", 0.70),
        ("PLAYBOOK-PB-007", "mitigated_by", 0.86),
        ("REQ-FS-031", "violates_requirement", 0.74),
        ("DC-2025-0847", "related_to", 0.42),
    ],
    "DC-2024-1190": [
        ("ECU-BRAKE", "affects_ecu", 0.92),
        ("PATTERN-022", "matches_pattern", 0.50),
        ("REQ-FS-031", "related_to", 0.40),
    ],
    "DC-2024-0903": [
        ("PATTERN-014", "matches_pattern", 0.65),
        ("ECU-POWERTRAIN", "affects_ecu", 0.30),
    ],
    "PATTERN-001": [
        ("DC-2025-0847", "observed_in", 0.95),
        ("PLAYBOOK-PB-019", "mitigated_by", 0.93),
    ],
    "PATTERN-014": [
        ("DC-2024-0903", "observed_in", 0.60),
    ],
    "PATTERN-022": [
        ("DC-2024-1190", "observed_in", 0.50),
    ],
    "ECU-BRAKE": [
        ("DC-2025-0847", "exhibits_defect", 0.85),
        ("DC-2025-0612", "exhibits_defect", 0.70),
        ("DC-2024-1190", "exhibits_defect", 0.92),
        ("REQ-FS-031", "constrained_by", 0.80),
    ],
    "ECU-POWERTRAIN": [
        ("DC-2025-0847", "exhibits_defect", 0.62),
    ],
    "PLAYBOOK-PB-019": [
        ("DC-2025-0847", "mitigates", 0.91),
        ("PATTERN-001", "addresses", 0.93),
    ],
    "PLAYBOOK-PB-007": [
        ("DC-2025-0612", "mitigates", 0.86),
    ],
    "REQ-FS-031": [
        ("DC-2025-0847", "violated_by", 0.78),
        ("DC-2025-0612", "violated_by", 0.74),
        ("ECU-BRAKE", "constrains", 0.80),
        ("ECU-POWERTRAIN", "constrains", 0.65),
    ],
}


# ---------------------------------------------------------------------------
# Search & traversal
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]+")


def _tokenize(text: str) -> List[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def _node_text(node: Dict[str, Any]) -> str:
    return " ".join(
        [
            node.get("id", ""),
            node.get("label", ""),
            node.get("summary", ""),
            " ".join(node.get("tags") or []),
        ]
    )


def _score(node: Dict[str, Any], query_tokens: List[str]) -> float:
    if not query_tokens:
        return float(node.get("weight", 0.0))
    haystack_tokens = set(_tokenize(_node_text(node)))
    overlap = sum(1 for t in query_tokens if t in haystack_tokens)
    if overlap == 0:
        return 0.0
    coverage = overlap / max(len(query_tokens), 1)
    base = float(node.get("weight", 0.5))
    # log-scaled token boost so multi-keyword queries dominate single-token ones
    boost = math.log1p(overlap) / math.log(1 + len(query_tokens) + 1)
    return round(min(1.0, base * 0.6 + coverage * 0.3 + boost * 0.1), 4)


def _bfs_neighbors(seed: str, depth: int) -> List[Dict[str, Any]]:
    """Return edges reachable within `depth` hops of `seed`."""
    if depth <= 0:
        return []
    seen: set[str] = {seed}
    queue: deque[Tuple[str, int]] = deque([(seed, 0)])
    out: List[Dict[str, Any]] = []
    while queue:
        node_id, d = queue.popleft()
        if d >= depth:
            continue
        for target, edge_type, weight in _EDGES.get(node_id, []):
            out.append(
                {
                    "from": node_id,
                    "to": target,
                    "type": edge_type,
                    "weight": weight,
                    "depth": d + 1,
                }
            )
            if target not in seen:
                seen.add(target)
                queue.append((target, d + 1))
    return out


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "query" in event or "node_type" in event:
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


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event or {})

    node_type: Optional[str] = payload.get("node_type")
    query: str = payload.get("query") or ""
    depth = int(payload.get("depth") or 1)
    limit = int(payload.get("limit") or 10)

    query_tokens = _tokenize(query)

    candidates: List[Tuple[float, Dict[str, Any]]] = []
    for node in _NODES:
        if node_type and node.get("type") != node_type:
            continue
        score = _score(node, query_tokens)
        if score <= 0.0 and query_tokens:
            continue
        candidates.append((score, node))

    candidates.sort(key=lambda x: (-x[0], x[1].get("id", "")))
    candidates = candidates[:limit]

    matches: List[Dict[str, Any]] = []
    for score, node in candidates:
        edges = _bfs_neighbors(node["id"], depth)
        matches.append(
            {
                "node": node["id"],
                "type": node["type"],
                "label": node.get("label"),
                "summary": node.get("summary"),
                "tags": node.get("tags") or [],
                "weight": score,
                "edges": edges,
            }
        )

    pr_total = sum(1 for n in _NODES if n["type"] == "defect_cluster")
    edge_total = sum(len(v) for v in _EDGES.values())

    if matches:
        top = matches[0]
        if top["type"] == "defect_cluster":
            summary = (
                f"Found {len(matches)} cluster(s); top match {top['node']} "
                f"({top['weight']:.2f}) — {top['label']}."
            )
        else:
            summary = f"Found {len(matches)} match(es); top {top['type']} = {top['node']}."
    else:
        summary = "No matches in the defect-cluster knowledge graph."

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "matches": matches,
        "graph_summary": summary,
        "graph_stats": {
            "total_nodes": len(_NODES),
            "total_edges": edge_total,
            "defect_clusters": pr_total,
        },
        "query_tokens": query_tokens,
        "elapsed_ms": elapsed_ms,
    }


if __name__ == "__main__":  # pragma: no cover
    print(
        json.dumps(
            handler(
                {
                    "node_type": "defect_cluster",
                    "query": "RingBuffer_Push unchecked return",
                    "depth": 2,
                }
            ),
            indent=2,
        )
    )
