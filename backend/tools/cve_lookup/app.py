"""
CVE lookup tool — queries the NVD 2.0 API and returns ranked vulnerability
matches. Falls back to a curated list of automotive-relevant CVEs when the
network is unreachable or the NVD rate limit is hit.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import requests

NVD_ENDPOINT = "https://services.nvd.nist.gov/rest/json/cves/2.0"
DEFAULT_TIMEOUT_S = float(os.environ.get("CVE_LOOKUP_TIMEOUT_S", "6.0"))
DEFAULT_PAGE_SIZE = int(os.environ.get("CVE_LOOKUP_PAGE_SIZE", "20"))
USER_AGENT = "ai-software-factory/cve-lookup (+https://github.com/bosch/ai-software-factory)"


# Curated fallback used when NVD is rate-limited or offline. These are real
# CVEs that recur in automotive / embedded discussions and keep the demo
# usable in air-gapped environments.
_FALLBACK_CVES: List[Dict[str, Any]] = [
    {
        "id": "CVE-2024-21626",
        "severity": "HIGH",
        "cvss": 8.6,
        "published": "2024-01-31T22:15:00Z",
        "description": "runc process.cwd file descriptor leak allows container escape; relevant where ECU build pipelines use containers.",
    },
    {
        "id": "CVE-2023-4863",
        "severity": "CRITICAL",
        "cvss": 8.8,
        "published": "2023-09-12T15:15:00Z",
        "description": "libwebp heap buffer overflow exploitable via crafted image; impacts IVI image decoders.",
    },
    {
        "id": "CVE-2022-22963",
        "severity": "CRITICAL",
        "cvss": 9.8,
        "published": "2022-04-01T23:15:00Z",
        "description": "Spring Cloud Function SpEL injection — used in OEM telematics backends.",
    },
    {
        "id": "CVE-2021-44228",
        "severity": "CRITICAL",
        "cvss": 10.0,
        "published": "2021-12-10T10:15:00Z",
        "description": "Apache Log4j2 JNDI lookup remote code execution (Log4Shell). Audit any Java component in the diagnostic stack.",
    },
    {
        "id": "CVE-2020-15808",
        "severity": "HIGH",
        "cvss": 7.5,
        "published": "2020-08-04T16:15:00Z",
        "description": "Buffer overflow in CAN open-source stack when handling oversized PDUs.",
    },
    {
        "id": "CVE-2019-9500",
        "severity": "CRITICAL",
        "cvss": 8.3,
        "published": "2019-04-17T17:29:00Z",
        "description": "Broadcom brcmfmac WiFi driver heap buffer overflow — impacts in-vehicle infotainment WiFi modules.",
    },
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _coerce_keywords(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return []


def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        return {}
    if "keywords" in event or "year_from" in event or "cvss_min" in event:
        return event
    body = event.get("body")
    if isinstance(body, dict):
        return body
    if isinstance(body, str):
        try:
            return json.loads(body)
        except Exception:
            return {}
    return {}


def _severity_from_cvss(score: float) -> str:
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    if score > 0.0:
        return "LOW"
    return "NONE"


def _parse_nvd_response(payload: Dict[str, Any], match_text: str) -> List[Dict[str, Any]]:
    cves: List[Dict[str, Any]] = []
    for item in payload.get("vulnerabilities", []):
        cve = item.get("cve") or {}
        cve_id = cve.get("id", "UNKNOWN")
        descriptions = cve.get("descriptions") or []
        description = next(
            (d.get("value") for d in descriptions if d.get("lang") == "en"),
            descriptions[0].get("value") if descriptions else "",
        )
        metrics = cve.get("metrics") or {}
        cvss_score = 0.0
        severity = "NONE"
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            entries = metrics.get(key) or []
            if not entries:
                continue
            data = entries[0].get("cvssData") or {}
            cvss_score = float(data.get("baseScore") or 0.0)
            severity = (
                data.get("baseSeverity")
                or entries[0].get("baseSeverity")
                or _severity_from_cvss(cvss_score)
            )
            break
        published = cve.get("published") or ""
        cves.append(
            {
                "id": cve_id,
                "severity": (severity or _severity_from_cvss(cvss_score)).upper(),
                "description": description,
                "cvss": round(cvss_score, 1),
                "published": published,
                "matches": match_text,
            }
        )
    return cves


def _fallback_results(keywords: List[str], year_from: int, cvss_min: float) -> List[Dict[str, Any]]:
    needle = [k.lower() for k in keywords]
    results: List[Dict[str, Any]] = []
    for entry in _FALLBACK_CVES:
        text = (entry["description"] + " " + entry["id"]).lower()
        if needle and not any(n in text for n in needle):
            continue
        published_year = int(entry["published"][:4])
        if published_year < year_from:
            continue
        if entry["cvss"] < cvss_min:
            continue
        results.append(
            {
                "id": entry["id"],
                "severity": entry["severity"],
                "description": entry["description"],
                "cvss": entry["cvss"],
                "published": entry["published"],
                "matches": ", ".join(keywords) or "(no keywords supplied)",
            }
        )
    results.sort(key=lambda r: (-r["cvss"], r["id"]))
    return results


def _query_nvd(keywords: List[str], year_from: int, page_size: int) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "resultsPerPage": min(max(page_size, 1), 50),
    }
    if keywords:
        params["keywordSearch"] = " ".join(keywords)
        params["keywordExactMatch"] = ""
    if year_from:
        params["pubStartDate"] = f"{year_from}-01-01T00:00:00.000"
        params["pubEndDate"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000")
    headers = {"User-Agent": USER_AGENT}
    api_key = os.environ.get("NVD_API_KEY")
    if api_key:
        headers["apiKey"] = api_key
    url = f"{NVD_ENDPOINT}?{urlencode(params)}"
    response = requests.get(url, headers=headers, timeout=DEFAULT_TIMEOUT_S)
    response.raise_for_status()
    return response.json()


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event)

    keywords = _coerce_keywords(payload.get("keywords"))
    year_from = int(payload.get("year_from") or 2018)
    cvss_min = float(payload.get("cvss_min") or 0.0)
    page_size = int(payload.get("limit") or DEFAULT_PAGE_SIZE)

    used_fallback = False
    fallback_reason: Optional[str] = None
    cves: List[Dict[str, Any]] = []

    try:
        nvd_payload = _query_nvd(keywords, year_from, page_size)
        cves = _parse_nvd_response(nvd_payload, ", ".join(keywords))
    except requests.HTTPError as exc:
        used_fallback = True
        fallback_reason = f"NVD HTTP {exc.response.status_code if exc.response else '?'}"
    except requests.RequestException as exc:
        used_fallback = True
        fallback_reason = f"NVD network error: {type(exc).__name__}"
    except (ValueError, KeyError) as exc:
        used_fallback = True
        fallback_reason = f"NVD payload error: {exc}"

    if used_fallback or not cves:
        if not cves:
            fallback_reason = fallback_reason or "NVD returned no results"
        cves = _fallback_results(keywords, year_from, cvss_min)

    # Apply filters consistently regardless of source.
    filtered: List[Dict[str, Any]] = []
    for cve in cves:
        if cve.get("cvss", 0.0) < cvss_min:
            continue
        published = cve.get("published") or ""
        if published and published[:4].isdigit() and int(published[:4]) < year_from:
            continue
        filtered.append(cve)

    filtered.sort(key=lambda r: (-float(r.get("cvss") or 0.0), r.get("id", "")))
    filtered = filtered[:page_size]

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "cves": filtered,
        "queried_at": _now_iso(),
        "source": "nvd-fallback" if used_fallback else "nvd-live",
        "fallback_reason": fallback_reason,
        "query": {
            "keywords": keywords,
            "year_from": year_from,
            "cvss_min": cvss_min,
            "limit": page_size,
        },
        "elapsed_ms": elapsed_ms,
    }


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(handler({"keywords": ["buffer", "overflow", "can"], "year_from": 2020}), indent=2))
