"""
MISRA C/C++ and AUTOSAR coding standards checker.

Implements regex-based detection for a curated subset of MISRA C 2012 and
AUTOSAR C++14 rules commonly enforced in safety-critical automotive code.
This is a static-analysis stub designed for the AgentCore Gateway demo;
production deployments should call into a real engine (Coverity, Polyspace,
PC-lint Plus) but the rule set, severities and finding shape are realistic.
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Pattern, Tuple


@dataclass
class Finding:
    severity: str
    rule: str
    message: str
    line: int
    snippet: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "rule": self.rule,
            "message": self.message,
            "line": self.line,
            "snippet": self.snippet,
        }


@dataclass
class Rule:
    id: str
    severity: str
    message: str
    detector: Callable[[List[str], str], List[Tuple[int, str]]]
    description: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_LINE_COMMENT_RE = re.compile(r"//.*?$", re.MULTILINE)
_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
_STRING_RE = re.compile(r'"(?:\\.|[^"\\])*"')

_FUNCTION_DEF_RE = re.compile(
    r"""
    ^[ \t]*                              # leading indentation
    (?:static\s+|inline\s+|extern\s+)*   # storage / linkage
    [A-Za-z_][\w\s\*&:<>,]*?\s+          # return type (greedy enough for ptrs/templates)
    ([A-Za-z_]\w*)\s*                    # function name (group 1)
    \([^;{}]*\)\s*                       # parameters
    (?:const\s*)?                        # cv-qualifier
    \{                                   # opening brace of body
    """,
    re.MULTILINE | re.VERBOSE,
)


def _strip_comments_and_strings(src: str) -> str:
    """Replace comments and string literals with spaces so regex matches don't
    fire inside them. We keep newlines so line numbers remain stable."""

    def _blank(match: re.Match[str]) -> str:
        return "".join(c if c == "\n" else " " for c in match.group(0))

    out = _BLOCK_COMMENT_RE.sub(_blank, src)
    out = _LINE_COMMENT_RE.sub(_blank, out)
    out = _STRING_RE.sub(_blank, out)
    return out


def _line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def _snippet(lines: List[str], line_no: int) -> str:
    idx = line_no - 1
    if 0 <= idx < len(lines):
        return lines[idx].strip()[:160]
    return ""


def _function_bodies(clean: str) -> List[Tuple[str, int, int, str]]:
    """Return (name, start_offset, end_offset, body) for each top-level
    function. Uses a simple brace counter to find the matching '}'."""
    bodies: List[Tuple[str, int, int, str]] = []
    for m in _FUNCTION_DEF_RE.finditer(clean):
        name = m.group(1)
        # Skip control-flow keywords that the loose regex may accept
        if name in {"if", "for", "while", "switch", "return", "sizeof"}:
            continue
        start = m.end() - 1  # the '{'
        depth = 0
        i = start
        while i < len(clean):
            c = clean[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    bodies.append((name, m.start(), i, clean[start : i + 1]))
                    break
            i += 1
    return bodies


# ---------------------------------------------------------------------------
# Rule detectors
# ---------------------------------------------------------------------------

# MISRA C 2012 Rule 11.3 — cast between unrelated pointer types.
_M11_3_RE = re.compile(
    r"\(\s*(?:struct\s+|union\s+)?[A-Za-z_]\w*\s*\*+\s*\)\s*"
    r"\(\s*\(\s*(?:struct\s+|union\s+|unsigned\s+|signed\s+)?[A-Za-z_]\w*\s*\*+\s*\)"
)


def _detect_11_3(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    return [(_line_of(clean, m.start()), m.group(0)) for m in _M11_3_RE.finditer(clean)]


# MISRA C 2012 Rule 11.5 — conversion from pointer-to-void to pointer-to-object.
_M11_5_RE = re.compile(
    r"\(\s*(?:struct\s+|union\s+)?[A-Za-z_]\w*\s*\*+\s*\)\s*"
    r"(?:[A-Za-z_]\w*|\(\s*void\s*\*+\s*\)[A-Za-z_]\w*)"
)
_VOID_PTR_HINT_RE = re.compile(r"\bvoid\s*\*")


def _detect_11_5(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for m in _M11_5_RE.finditer(clean):
        # Only flag if the surrounding context likely involves a void* source.
        window_start = max(0, m.start() - 200)
        window = clean[window_start : m.end()]
        if _VOID_PTR_HINT_RE.search(window) or "malloc" in window or "calloc" in window:
            hits.append((_line_of(clean, m.start()), m.group(0)))
    return hits


# MISRA C 2012 Rule 14.4 — controlling expression must be of essentially Boolean type.
_M14_4_RE = re.compile(
    r"\b(?:if|while)\s*\(\s*"
    r"(?P<expr>[A-Za-z_]\w*(?:\s*->\s*\w+|\s*\.\s*\w+)*|\![A-Za-z_]\w*|\*[A-Za-z_]\w*)"
    r"\s*\)"
)
_BOOLEAN_OPS_RE = re.compile(r"(==|!=|<=|>=|<|>|&&|\|\|)")


def _detect_14_4(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for m in _M14_4_RE.finditer(clean):
        expr = m.group("expr")
        if _BOOLEAN_OPS_RE.search(expr):
            continue
        # heuristically allow names that suggest boolean intent
        if re.search(r"(?:^|_)(is|has|can|should|done|ready|ok|valid|enabled)(?:_|$)", expr, re.IGNORECASE):
            continue
        hits.append((_line_of(clean, m.start()), m.group(0)))
    return hits


# MISRA C 2012 Rule 15.5 — function shall have a single point of exit at the end.
_RETURN_RE = re.compile(r"\breturn\b")


def _detect_15_5(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for name, _start, _end, body in _function_bodies(clean):
        returns = list(_RETURN_RE.finditer(body))
        if len(returns) <= 1:
            continue
        first_extra = returns[1]
        line = _line_of(clean, _start + first_extra.start())
        hits.append((line, f"function '{name}' has {len(returns)} return statements"))
    return hits


# MISRA C 2012 Rule 17.7 — value returned by a function shall be used.
_IGNORED_RETURN_RE = re.compile(
    r"^[ \t]*(?!(?:return|if|while|for|switch|case|else|do|;|\}|\{|//|/\*))"
    r"(?P<call>[A-Za-z_]\w*(?:\s*->\s*\w+|\s*\.\s*\w+)*\s*\([^;]*\))\s*;",
    re.MULTILINE,
)
_FUNCTIONS_WITH_RETURN = {
    "strcpy",
    "strcat",
    "strncpy",
    "memcpy",
    "memmove",
    "scanf",
    "sscanf",
    "fopen",
    "fclose",
    "fread",
    "fwrite",
    "malloc",
    "calloc",
    "realloc",
    "snprintf",
    "vsnprintf",
    "RingBuffer_Push",
    "RingBuffer_Pop",
    "Can_Write",
    "Can_Read",
}


def _detect_17_7(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for m in _IGNORED_RETURN_RE.finditer(clean):
        call = m.group("call")
        callee = re.match(r"\s*([A-Za-z_]\w*)", call)
        if not callee:
            continue
        name = callee.group(1)
        if name in _FUNCTIONS_WITH_RETURN:
            hits.append((_line_of(clean, m.start("call")), call.strip()))
    return hits


# MISRA C 2012 Rule 21.6 — banned standard library functions in safety-critical code.
_BANNED_STDLIB = {
    "printf": "MISRA 21.6 / Rule 21.6: stdio output not permitted",
    "fprintf": "MISRA 21.6: stdio output not permitted",
    "sprintf": "MISRA 21.6: use snprintf instead",
    "gets": "MISRA 21.6: gets() is unbounded",
    "scanf": "MISRA 21.6: stdio input not permitted",
    "malloc": "MISRA 21.3: dynamic memory allocation forbidden",
    "calloc": "MISRA 21.3: dynamic memory allocation forbidden",
    "realloc": "MISRA 21.3: dynamic memory allocation forbidden",
    "free": "MISRA 21.3: dynamic memory allocation forbidden",
    "strcpy": "MISRA 21.6: prefer strncpy_s / bounded copy",
    "strcat": "MISRA 21.6: prefer strncat_s / bounded concat",
    "atoi": "MISRA 21.7: atoi has undefined behaviour on bad input",
    "system": "MISRA 21.6: system() is forbidden",
}
_BANNED_RE = re.compile(r"\b(" + "|".join(re.escape(k) for k in _BANNED_STDLIB) + r")\s*\(")


def _detect_21_6(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for m in _BANNED_RE.finditer(clean):
        name = m.group(1)
        msg = _BANNED_STDLIB[name]
        hits.append((_line_of(clean, m.start()), f"{name}(...)  -- {msg}"))
    return hits


# MISRA C 2012 Rule 9.1 — value of an object with automatic storage duration
# shall be initialized before being read.
_DECL_RE = re.compile(
    r"^[ \t]*"
    r"(?:static\s+|register\s+|volatile\s+|const\s+)*"
    r"(?:unsigned\s+|signed\s+)?"
    r"(?:u?int(?:8|16|32|64)_t|float|double|char|short|int|long|bool|size_t|"
    r"[A-Z][A-Za-z0-9_]*_t)\s+"
    r"(?P<name>[A-Za-z_]\w*)\s*"
    r"(?P<rest>(?:,\s*[A-Za-z_]\w*\s*)*)"
    r"\s*;",
    re.MULTILINE,
)


def _detect_9_1(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for name, start, end, body in _function_bodies(clean):
        for m in _DECL_RE.finditer(body):
            decl_line = _line_of(clean, start + m.start())
            var = m.group("name")
            # ignore obvious "may be a struct field"
            if var.isupper():
                continue
            hits.append((decl_line, f"{var}: declared without initializer"))
    return hits


# MISRA C 2012 Rule 8.4 — a compatible declaration shall be visible when an
# object or function with external linkage is defined. Heuristic: flag
# non-static functions defined without a prior prototype in the same file.
_PROTO_RE = re.compile(
    r"^[ \t]*(?!static\b)(?:extern\s+|inline\s+)*"
    r"[A-Za-z_][\w\s\*&:<>,]*?\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*;",
    re.MULTILINE,
)


def _detect_8_4(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    declared: set[str] = set()
    for m in _PROTO_RE.finditer(clean):
        declared.add(m.group(1))
    hits: List[Tuple[int, str]] = []
    for m in _FUNCTION_DEF_RE.finditer(clean):
        # Skip 'static' definitions
        head = clean[max(0, m.start()) : m.end()]
        if re.match(r"^[ \t]*static\b", head):
            continue
        name = m.group(1)
        if name in {"main"} or name.startswith("__"):
            continue
        if name not in declared:
            line = _line_of(clean, m.start())
            hits.append((line, f"definition of '{name}' has no visible prototype"))
    return hits


# AUTOSAR C++14 A0-1-1 — a project shall not contain unused variables.
_LOCAL_DECL_RE = re.compile(
    r"^[ \t]*"
    r"(?:auto\s+|const\s+|static\s+|volatile\s+)*"
    r"(?:unsigned\s+|signed\s+)?"
    r"(?:u?int(?:8|16|32|64)_t|float|double|char|short|int|long|bool|size_t|"
    r"[A-Z][A-Za-z0-9_]*_t)\s+"
    r"(?P<name>[A-Za-z_]\w*)\s*"
    r"(?:=\s*[^;]+)?\s*;",
    re.MULTILINE,
)


def _detect_autosar_a0_1_1(lines: List[str], clean: str) -> List[Tuple[int, str]]:
    hits: List[Tuple[int, str]] = []
    for name, start, end, body in _function_bodies(clean):
        for m in _LOCAL_DECL_RE.finditer(body):
            var = m.group("name")
            if var in {"i", "j", "k", "n", "len", "tmp", "buf"}:
                # idiomatic short names — skip to avoid noise
                continue
            # crude usage check: name appears after declaration
            after = body[m.end() :]
            if not re.search(r"\b" + re.escape(var) + r"\b", after):
                line = _line_of(clean, start + m.start())
                hits.append((line, f"variable '{var}' declared in '{name}' but never used"))
    return hits


# AUTOSAR C++14 A5-2-2 — traditional C-style casts shall not be used.
_C_STYLE_CAST_RE = re.compile(
    r"\(\s*(?:const\s+|volatile\s+)*"
    r"(?:unsigned\s+|signed\s+)?"
    r"(?:u?int(?:8|16|32|64)_t|float|double|char|short|int|long|bool|size_t|"
    r"[A-Z][A-Za-z0-9_]*_t|[a-z_][a-z0-9_]*_t)"
    r"\s*\*?\s*\)\s*"
    r"(?:[A-Za-z_]\w*|\([^()]+\))"
)


def _detect_autosar_a5_2_2(lines: List[str], clean: str, file_path: str) -> List[Tuple[int, str]]:
    if not file_path.lower().endswith((".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx")):
        return []
    hits: List[Tuple[int, str]] = []
    for m in _C_STYLE_CAST_RE.finditer(clean):
        hits.append((_line_of(clean, m.start()), m.group(0)))
    return hits


# ---------------------------------------------------------------------------
# Rule registry
# ---------------------------------------------------------------------------

def _build_rules(file_path: str) -> List[Rule]:
    return [
        Rule("MISRA-11.3", "critical", "Cast between unrelated pointer types",
             lambda lines, clean: _detect_11_3(lines, clean),
             "MISRA C 2012 Rule 11.3"),
        Rule("MISRA-11.5", "warning", "Cast from void* to specific pointer type",
             lambda lines, clean: _detect_11_5(lines, clean),
             "MISRA C 2012 Rule 11.5"),
        Rule("MISRA-14.4", "warning", "Controlling expression must be essentially Boolean",
             lambda lines, clean: _detect_14_4(lines, clean),
             "MISRA C 2012 Rule 14.4"),
        Rule("MISRA-15.5", "info", "Function should have a single exit point",
             lambda lines, clean: _detect_15_5(lines, clean),
             "MISRA C 2012 Rule 15.5"),
        Rule("MISRA-17.7", "critical", "Return value of non-void function must be used",
             lambda lines, clean: _detect_17_7(lines, clean),
             "MISRA C 2012 Rule 17.7"),
        Rule("MISRA-21.6", "critical", "Use of forbidden Standard Library function",
             lambda lines, clean: _detect_21_6(lines, clean),
             "MISRA C 2012 Rule 21.6 / 21.3"),
        Rule("MISRA-9.1", "warning", "Object with automatic storage used before initialization",
             lambda lines, clean: _detect_9_1(lines, clean),
             "MISRA C 2012 Rule 9.1"),
        Rule("MISRA-8.4", "info", "External definition without compatible declaration",
             lambda lines, clean: _detect_8_4(lines, clean),
             "MISRA C 2012 Rule 8.4"),
        Rule("AUTOSAR-A0-1-1", "info", "Unused local variable",
             lambda lines, clean: _detect_autosar_a0_1_1(lines, clean),
             "AUTOSAR C++14 A0-1-1"),
        Rule("AUTOSAR-A5-2-2", "warning", "C-style cast in C++ translation unit",
             lambda lines, clean: _detect_autosar_a5_2_2(lines, clean, file_path),
             "AUTOSAR C++14 A5-2-2"),
    ]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _extract_input(event: Dict[str, Any]) -> Dict[str, Any]:
    """Tolerate a few common Lambda invocation shapes."""
    if isinstance(event, dict):
        if "code" in event:
            return event
        body = event.get("body")
        if isinstance(body, dict):
            return body
        if isinstance(body, str):
            try:
                import json
                return json.loads(body)
            except Exception:
                return {}
    return {}


def handler(event: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    started = time.perf_counter()
    payload = _extract_input(event)
    code: str = payload.get("code") or ""
    file_path: str = payload.get("file_path") or "<inline>"

    if not code:
        return {
            "findings": [],
            "loc": 0,
            "scanned_rules": 0,
            "error": "missing required parameter 'code'",
        }

    lines = code.splitlines()
    clean = _strip_comments_and_strings(code)
    rules = _build_rules(file_path)

    findings: List[Finding] = []
    for rule in rules:
        try:
            for line_no, snippet in rule.detector(lines, clean):
                findings.append(
                    Finding(
                        severity=rule.severity,
                        rule=rule.id,
                        message=rule.message,
                        line=line_no,
                        snippet=snippet or _snippet(lines, line_no),
                    )
                )
        except Exception as exc:  # noqa: BLE001 — keep one bad rule from killing the scan
            findings.append(
                Finding(
                    severity="info",
                    rule=rule.id,
                    message=f"detector failed: {exc}",
                    line=0,
                    snippet="",
                )
            )

    findings.sort(key=lambda f: (f.line, f.rule))

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "findings": [f.to_dict() for f in findings],
        "loc": len(lines),
        "scanned_rules": len(rules),
        "file_path": file_path,
        "scan_time_ms": elapsed_ms,
    }


if __name__ == "__main__":  # pragma: no cover — local smoke test
    sample = """
    #include <stdio.h>
    #include <stdlib.h>

    int compute(int x) {
        int y;            // MISRA 9.1
        if (x) {           // MISRA 14.4
            return 1;
        }
        return 0;          // MISRA 15.5 trigger combined with above
    }

    void run(void) {
        char *p = (char *)malloc(64);   // MISRA 21.3 / 11.5
        strcpy(p, \"hello\");            // MISRA 21.6 + 17.7 (return ignored)
        struct S *s = (struct S *)((char *)p);  // MISRA 11.3
        printf(\"x=%d\", compute(1));
    }
    """
    import json as _json
    print(_json.dumps(handler({"code": sample, "file_path": "demo.c"}), indent=2))
