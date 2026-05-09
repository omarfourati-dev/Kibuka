# Observability

The observability stack provides metrics, logs, traces, and error tracking in a unified setup that works both locally and in production.

---

## Stack Overview

| Tool              | Purpose                                   |
| ----------------- | ----------------------------------------- |
| **Prometheus**    | Metrics collection and storage            |
| **Grafana**       | Dashboards and alerting                   |
| **Loki**          | Log aggregation                           |
| **Promtail**      | Log shipping to Loki                      |
| **Sentry**        | Error tracking and performance monitoring |
| **OpenTelemetry** | Distributed tracing                       |

All components are included in `deploy/docker/docker-compose.yml` for production and `deploy/docker/docker-compose.dev.yml` for local development.

---

## Prometheus Metrics

Metrics are exposed at `GET /metrics` on the backend (protected from public access via nginx — internal only).

Instrumentation is provided by `prometheus-fastapi-instrumentator`:

```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

### Custom Metrics

| Metric                         | Type    | Description                                    |
| ------------------------------ | ------- | ---------------------------------------------- |
| `ai_requests_total`            | Counter | Total AI API calls by provider and model       |
| `ai_cost_usd_total`            | Counter | Cumulative AI spend in USD by space            |
| `ai_tokens_total`              | Counter | Token usage by type (prompt/completion)        |
| `rag_documents_total`          | Gauge   | Documents indexed per space                    |
| `background_jobs_total`        | Counter | ARQ jobs by status (enqueued/completed/failed) |
| `active_websocket_connections` | Gauge   | Current WebSocket connection count             |

---

## Grafana Dashboards

Pre-built dashboards are in `deploy/grafana/dashboards/`:

- `backend-overview.json` — Request rate, error rate, latency percentiles (P50/P95/P99), active connections
- `ai-usage.json` — Token consumption, cost by space, model usage breakdown
- `database.json` — Query latency, connection pool utilization, slow query log

Dashboards are provisioned automatically on Grafana startup via `deploy/grafana/provisioning/`.

Access Grafana at `http://localhost:3001` (dev) or configure the public URL in production.

---

## Loki Log Aggregation

All application logs are structured JSON, shipped to Loki via Promtail:

```python
import structlog
log = structlog.get_logger()
log.info("user.login", user_id=str(user.id), space_id=str(space.id), method="google_oauth")
```

Every log entry includes:

- `timestamp`
- `level`
- `event` (the log message)
- `service` (backend/worker)
- `correlation_id` (see below)
- Business context (user_id, space_id where applicable)

Promtail is configured to tail container logs and forward to Loki. Configuration: `deploy/loki/promtail-config.yaml`.

---

## Correlation IDs

Every HTTP request receives a `X-Correlation-ID` header (generated if not provided by the client). The ID is:

- Attached to the request context via FastAPI middleware
- Included in every log entry for that request
- Returned in the `X-Correlation-ID` response header
- Passed to downstream ARQ jobs (so background work for a request can be traced back)

To trace all activity for a specific request in Grafana/Loki:

```
{service="backend"} | json | correlation_id="abc-123-def"
```

---

## Sentry Error Tracking

Sentry captures unhandled exceptions and slow transactions in production.

```python
import sentry_sdk
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,   # 10% of transactions traced
    profiles_sample_rate=0.1,
)
```

Sentry is initialized only if `SENTRY_DSN` is set. Local development runs without Sentry.

User PII is scrubbed before sending to Sentry via `before_send` hook. Only the user ID is attached to events (not email or name).

---

## OpenTelemetry Traces

Distributed traces are collected via the OpenTelemetry SDK and exported to Grafana Tempo (or any OTLP-compatible backend).

Automatic instrumentation covers FastAPI routes, SQLAlchemy queries, and httpx outbound requests. Manual spans can be added for critical business operations:

```python
from opentelemetry import trace
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("rag.retrieve") as span:
    span.set_attribute("top_k", top_k)
    chunks = await retriever.retrieve(query, space_id, top_k=top_k)
    span.set_attribute("chunks_found", len(chunks))
```

---

## Alerts

The following alert rules are configured in `deploy/grafana/alerts/`:

| Alert                    | Condition                                 | Severity |
| ------------------------ | ----------------------------------------- | -------- |
| High error rate          | HTTP 5xx rate > 1% over 5 minutes         | Critical |
| High latency             | P99 response time > 1000ms over 5 minutes | Warning  |
| DB connection saturation | Connection pool usage > 80%               | Warning  |
| Background job failures  | Failed ARQ jobs > 10 in 10 minutes        | Warning  |
| AI cost spike            | Hourly AI spend > $5                      | Warning  |
| Service down             | Health check failing for 2 minutes        | Critical |

Alert notifications are sent via the `ALERTMANAGER_*` configuration in the environment. Supported channels: PagerDuty, Slack, email.

---

## Health Checks

```
GET /health        # Basic liveness check — returns 200 if process is running
GET /health/ready  # Readiness check — verifies DB and Redis connectivity
```

Kubernetes liveness and readiness probes use these endpoints.

---

## Environment Variables

| Variable                      | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `SENTRY_DSN`                  | Sentry project DSN (leave empty to disable)          |
| `ENVIRONMENT`                 | `development`, `staging`, or `production`            |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint                     |
| `OTEL_TRACES_SAMPLE_RATE`     | Fraction of requests to trace. Default: `0.1`        |
| `LOG_LEVEL`                   | `DEBUG`, `INFO`, `WARNING`, `ERROR`. Default: `INFO` |
