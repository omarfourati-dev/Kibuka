# Deployment: Docker Compose

Docker Compose is the simplest production deployment option. Suitable for single-server deployments, small teams, and projects that don't yet need Kubernetes scaling.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose V2
- A server with at least 2 GB RAM and 20 GB disk
- `.env` file configured for production (see below)
- A domain pointing to your server's IP (for TLS)

---

## Production Environment Variables

The production `.env` differs from dev in a few key areas:

```bash
ENVIRONMENT=production
DEBUG=false

# Use strong, randomly generated values
SECRET_KEY=<openssl rand -hex 32>
DATABASE_URL=postgresql+asyncpg://postgres:<password>@postgres:5432/myapp

# Use your actual domain
APP_URL=https://myapp.com
CORS_ORIGINS=https://myapp.com

# Production OAuth redirect
GOOGLE_REDIRECT_URI=https://myapp.com/api/auth/google/callback

# Enable billing if configured
ENABLE_BILLING=true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Build Images

```bash
# Build all images
docker compose build

# Build a specific service
docker compose build backend
docker compose build frontend
```

Images are built from `apps/backend/Dockerfile` and `apps/frontend/Dockerfile`. The frontend build produces static assets served by nginx.

---

## Deploy

```bash
# Start all services in the background
docker compose up -d

# Verify all containers are running
docker compose ps
```

Services started:

| Service      | Internal Port | Description                     |
| ------------ | ------------- | ------------------------------- |
| `nginx`      | 80, 443       | Reverse proxy + TLS termination |
| `backend`    | 8000          | FastAPI application             |
| `worker`     | —             | ARQ background job worker       |
| `frontend`   | —             | Static assets served by nginx   |
| `postgres`   | 5432          | PostgreSQL database             |
| `redis`      | 6379          | Cache + job queue               |
| `prometheus` | 9090          | Metrics collection              |
| `grafana`    | 3001          | Dashboards                      |
| `loki`       | 3100          | Log aggregation                 |
| `promtail`   | —             | Log shipping                    |

---

## TLS with Let's Encrypt

The nginx container uses `certbot` for automatic TLS certificate provisioning.

Before starting, set in `.env`:

```bash
NGINX_HOST=myapp.com
CERTBOT_EMAIL=admin@myapp.com
```

On first deploy:

```bash
# Provision certificate (standalone mode — nginx must not be running yet)
docker compose run --rm certbot certonly --standalone -d myapp.com

# Now start nginx with the certificate
docker compose up -d nginx
```

Certificates auto-renew via a cron job inside the certbot container.

---

## Database Migrations

Run migrations before starting the backend:

```bash
docker compose run --rm backend alembic upgrade head
```

On subsequent deploys, migrations run automatically in the backend container's entrypoint script if `AUTO_MIGRATE=true` is set. For production, prefer running them manually before updating the backend to control timing.

---

## Health Checks

Docker Compose health checks are configured in `docker-compose.yml`. Check current health:

```bash
docker compose ps   # shows health status for each service
```

Backend health:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

---

## Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f worker

# Last 100 lines
docker compose logs --tail=100 backend
```

---

## Updates

```bash
# Pull latest code
git pull origin main

# Rebuild changed images
docker compose build

# Apply database migrations
docker compose run --rm backend alembic upgrade head

# Restart with new images (zero-downtime for stateless services)
docker compose up -d --no-deps backend worker frontend
```

The `--no-deps` flag restarts only the specified services without restarting postgres or redis.

---

## Backups

### Database

```bash
# Dump database to file
docker compose exec postgres pg_dump -U postgres myapp > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20240101.sql | docker compose exec -T postgres psql -U postgres myapp
```

Automate with a cron job:

```
0 3 * * * cd /opt/myapp && docker compose exec postgres pg_dump -U postgres myapp > /backups/myapp_$(date +\%Y\%m\%d).sql
```

### Uploaded Files

If using local file storage, back up the Docker volume:

```bash
docker run --rm -v myapp_uploads:/data -v /backups:/backup alpine \
    tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data
```

For production, configure cloud storage (S3 or compatible) via `FILE_STORAGE_BACKEND=s3`.

---

## Scaling

Docker Compose supports running multiple replicas of stateless services:

```bash
docker compose up -d --scale backend=3 --scale worker=2
```

nginx load-balances across backend replicas automatically. This requires sticky sessions to be disabled (they are not used — the app is stateless at the HTTP layer).
