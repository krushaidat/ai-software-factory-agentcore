# AgentCore Event Contracts

Source of truth for all events flowing between agents, the trace streamer, and the frontend.
Every event is a JSON object pushed via WebSocket to subscribed clients.

## Common envelope

All events share a base envelope:

```json
{
  "type": "<event_type>",
  "timestamp": "2026-04-30T14:32:01.123Z",
  "sessionId": "<sessionId>",
  "runId": "<runId>",
  "agentName": "supervisor | quality_agent | safety_agent | ...",
  "spanId": "<otel_span_id>",
  "parentSpanId": "<otel_parent_span_id> | null",
  "payload": { ... }
}
```

## Event types

### `agent_thinking`
Token-by-token reasoning stream (from Bedrock streaming inside an agent).
```json
{ "type": "agent_thinking", "payload": { "delta": "<text chunk>", "done": false } }
```

### `agent_invoked`
Supervisor or specialist starts execution.
```json
{ "type": "agent_invoked", "payload": { "task": "<short description>", "input": {...} } }
```

### `agent_completed`
Agent finishes with a result.
```json
{ "type": "agent_completed", "payload": { "result": {...}, "tokens_in": 1234, "tokens_out": 567, "duration_ms": 4321 } }
```

### `agent_failed`
Agent error.
```json
{ "type": "agent_failed", "payload": { "error": "...", "retryable": true } }
```

### `tool_call`
Agent invoked a tool via Gateway.
```json
{
  "type": "tool_call",
  "payload": {
    "tool_name": "misra_checker",
    "via": "agentcore_gateway | code_interpreter | browser",
    "params": {...},
    "tool_call_id": "tc-abc123"
  }
}
```

### `tool_result`
Tool returned.
```json
{
  "type": "tool_result",
  "payload": {
    "tool_call_id": "tc-abc123",
    "result": {...},
    "duration_ms": 234,
    "error": null
  }
}
```

### `a2a_message`
Agent-to-agent message (specialist asks another specialist).
```json
{
  "type": "a2a_message",
  "payload": {
    "from": "safety_agent",
    "to": "quality_agent",
    "message": "What's the cyclomatic complexity of CAN_TimeoutHandler?",
    "purpose": "asil_evidence | cross_check | request_data"
  }
}
```

### `memory_read`
Agent queried AgentCore Memory.
```json
{
  "type": "memory_read",
  "payload": {
    "strategy": "USER_PREFERENCE | SEMANTIC | SUMMARY | SHORT_TERM",
    "query": "...",
    "matches": [{"text": "...", "score": 0.92}],
    "duration_ms": 45
  }
}
```

### `memory_write`
Agent stored a fact.
```json
{
  "type": "memory_write",
  "payload": {
    "strategy": "SEMANTIC",
    "content": "User prefers concise explanations",
    "namespace": "user_preferences/khaled@stormreply.com"
  }
}
```

### `code_execution`
Code Interpreter execution event.
```json
{
  "type": "code_execution",
  "payload": {
    "language": "python",
    "code": "...",
    "stdout": "...",
    "stderr": null,
    "duration_ms": 1230
  }
}
```

### `browser_action`
AgentCore Browser action.
```json
{
  "type": "browser_action",
  "payload": {
    "action": "navigate | click | extract",
    "url": "https://nvd.nist.gov/...",
    "result_summary": "Found 3 CVEs matching pattern",
    "screenshot_url": "<optional s3 url>"
  }
}
```

### `pipeline_started` / `pipeline_completed` / `pipeline_failed`
Top-level lifecycle events for the entire run.
```json
{
  "type": "pipeline_started",
  "payload": { "fileId": "autoware/control/pid_longitudinal/...", "mode": "optB" }
}
```

```json
{
  "type": "pipeline_completed",
  "payload": {
    "duration_ms": 23456,
    "totalTokens": 45678,
    "totalCost": 0.42,
    "agentsInvoked": ["quality", "safety", "security", "test", "deployment", "integration"]
  }
}
```

### `cost_update`
Live cost ticker update.
```json
{
  "type": "cost_update",
  "payload": {
    "session_total": 0.42,
    "today_total": 1.23,
    "breakdown": { "bedrock": 0.30, "agentcore_runtime": 0.08, "memory": 0.01, "browser": 0.02, "code_interpreter": 0.01 }
  }
}
```

## Frontend subscription

Frontend subscribes to these events via the existing WebSocket. See:
- `src/services/agentcore-events.ts` — parses events
- `src/hooks/useAgentStream.ts` — exposes events to components
- `src/types/agents.ts` — TypeScript types matching this contract

## Storage

In addition to streaming, every event is persisted to DynamoDB `pipeline-runs` table for replay:
- PK: `sessionId#runId`
- SK: `event#<timestamp>#<spanId>`

This enables session replay and the Memory Replay tab.
