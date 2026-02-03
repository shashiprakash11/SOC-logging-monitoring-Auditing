# SOC Logging, Monitoring & Auditing

Production-ready SOC logging platform with multi-tenant isolation, OpenSearch indexing, audit trails, alert rules, and a React admin UI.

## Architecture

```
[Sources] -> [API / Syslog / Webhooks] -> [Redis Streams] -> [OpenSearch]
                   |                        |-> [Alert Rules]
                   |-> [PostgreSQL Audit]
                   |-> [Prometheus Metrics]

Admin UI -> Backend APIs -> PostgreSQL + OpenSearch
```

## Quick start (local)

```bash
cp .env.example .env
make dev
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173
- OpenSearch Dashboards: http://localhost:5601
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

### Demo credentials
- Email: `admin@soc.local`
- Password: `ChangeMe123!`

## API
- `POST /api/v1/auth/login`
- `POST /api/v1/ingest`
- `POST /api/v1/syslog`
- `POST /api/v1/webhook`
- `GET /api/v1/search`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts`
- `GET /api/v1/audit`

See `openapi.yaml` for details.

## Environment variables
- `PORT`
- `JWT_SECRET`
- `JWT_ISSUER`
- `DATABASE_URL`
- `OPENSEARCH_URL`
- `OPENSEARCH_INDEX`
- `REDIS_URL`
- `RETENTION_DAYS`
- `SYSLOG_ENABLED`
- `SYSLOG_TCP_PORT`
- `SYSLOG_UDP_PORT`
- `SMTP_HOST`
- `SMTP_PORT`
- `NOTIFY_WEBHOOK_URL`
- `CORS_ORIGIN`
- `HTTPS_ENABLED`
- `HTTPS_KEY_PATH`
- `HTTPS_CERT_PATH`

## Multi-tenant enforcement
Each request requires a JWT containing `tenantId`. The middleware enforces tenant isolation by comparing JWT tenant to `x-tenant-id` headers.

## Retention
`RETENTION_DAYS` controls index deletion. The backend schedules a daily retention job.

## Security
- Helmet, CORS, rate limiting
- JWT auth with RBAC roles: `admin`, `analyst`, `auditor`, `readonly`
- Input validation with Zod

### HTTPS (self-signed demo)

```bash
./scripts/generate_certs.sh
HTTPS_ENABLED=true HTTPS_KEY_PATH=./certs/key.pem HTTPS_CERT_PATH=./certs/cert.pem make dev
```

## Switching to managed Elasticsearch
Set `OPENSEARCH_URL` to your Elasticsearch endpoint. If using Elasticsearch > 7, ensure compatibility with the OpenSearch client or swap to `@elastic/elasticsearch`.

## Kubernetes
Manifests live under `k8s/`. Update image names and secrets before applying.

## Backups
Use `scripts/backup.sh` for OpenSearch snapshots and PostgreSQL dumps.

## Makefile
- `make dev`
- `make build`
- `make test`
- `make deploy-local`
- `make seed`

## TODOs
- Replace SMTP stub with a real provider
- Harden alert rule engine (add DSL or sandboxed evaluation)
- Enable OpenSearch security plugin for production
