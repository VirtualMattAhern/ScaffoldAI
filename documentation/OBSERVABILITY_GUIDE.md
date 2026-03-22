# SkafoldAI Observability Guide

**Last updated:** 2026-03-22 UTC

This guide covers the first V3 observability slice for the API: structured logs, request IDs, and starter Azure queries.

---

## What Ships In Code

- API responses include `X-Request-Id`
- Incoming `X-Request-Id` is preserved if the caller provides one
- Every API request logs `request.start` and `request.finish`
- API errors log structured JSON with route context and request ID
- Process-level failures log `process.unhandled_rejection` and `process.uncaught_exception`

All API logs are emitted as JSON to stdout/stderr so Azure Container Apps can capture them without a separate logging library.

---

## Environment Knob

Set this on the API Container App if you want more or less detail:

```env
LOG_LEVEL=info
```

Allowed values: `debug`, `info`, `warn`, `error`

---

## Useful Event Names

- `server.started`
- `server.schema_init_failed`
- `request.start`
- `request.finish`
- `request.unhandled_error`
- `auth.unauthorized`
- `brain_dump.convert_failed`
- `daily.helper_failed`
- `focus_sentence.suggest_failed`
- `decisions.generate_failed`
- `guided.task_chat_failed`
- `guided.substeps_failed`
- `playbooks.ai_suggest_failed`
- `playbooks.ai_refine_failed`
- `tasks.ai_suggest_top3_failed`
- `tasks.ai_reprioritize_top3_failed`
- `tasks.weekly_review_failed`
- `ai.request_retry_404`

---

## Azure Log Analytics Queries

If Container Apps logs are connected to Log Analytics, a common table is `ContainerAppConsoleLogs_CL`.
If your workspace uses a slightly different schema, adapt the column names but keep the same parsing idea.

### Recent errors

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| extend payload = parse_json(Log_s)
| where tostring(payload.level) == "error"
| project TimeGenerated, event=tostring(payload.event), requestId=tostring(payload.requestId), path=tostring(payload.path), message=tostring(payload.error.message)
| order by TimeGenerated desc
```

### Slow requests

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| extend payload = parse_json(Log_s)
| where tostring(payload.event) == "request.finish"
| extend durationMs = todouble(payload.durationMs)
| where durationMs > 1500
| project TimeGenerated, method=tostring(payload.method), path=tostring(payload.path), statusCode=tostring(payload.statusCode), durationMs, requestId=tostring(payload.requestId)
| order by durationMs desc
```

### Unauthorized spikes

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| extend payload = parse_json(Log_s)
| where tostring(payload.event) == "auth.unauthorized"
| summarize count() by bin(TimeGenerated, 15m), path=tostring(payload.path)
| order by TimeGenerated desc
```

### Trace one request

```kusto
let requestId = "paste-request-id-here";
ContainerAppConsoleLogs_CL
| extend payload = parse_json(Log_s)
| where tostring(payload.requestId) == requestId
| project TimeGenerated, level=tostring(payload.level), event=tostring(payload.event), path=tostring(payload.path), statusCode=tostring(payload.statusCode), message=tostring(payload.error.message)
| order by TimeGenerated asc
```

---

## Starter Dashboard / Alerts

Recommended first alerts:

- 5xx error count above baseline over 15 minutes
- `request.finish` p95 duration above 2000 ms
- `auth.unauthorized` surge above normal baseline
- repeated `server.schema_init_failed` or `process.uncaught_exception`

Recommended first dashboard tiles:

- requests per 15 minutes
- error count by event
- slowest paths
- auth failures over time

---

## Support Workflow

When a user reports a failure:

1. Ask for the approximate time and, if shown, the request ID.
2. Query logs by `requestId`.
3. Look for the matching `request.finish` or route-specific failure event.
4. Correlate with Azure Container Apps revision / deploy time if the issue started right after release.
