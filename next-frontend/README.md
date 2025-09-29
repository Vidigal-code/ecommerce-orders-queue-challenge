# E-commerce Orders Queue Challenge
Full Stack Solution (Backend: NestJS + Bull + MongoDB + Redis | Frontend: Next.js 15 + React 19 + Tailwind)

---

## Table of Contents
- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Backend (NestJS) Overview](#backend-nestjs-overview)
- [Processing Lifecycle (Phases)](#processing-lifecycle-phases)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Execution Metrics & Logging](#execution-metrics--logging)
- [Cancellation & Reset Flow](#cancellation--reset-flow)
- [Frontend (Next.js) Dashboard](#frontend-nextjs-dashboard)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Docker (Optional)](#docker-optional)
- [Performance Notes](#performance-notes)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Roadmap / Future Enhancements](#roadmap--future-enhancements)
- [License](#license)

---

## Example

<img src="/next-frontend/example/next-example.png" alt="" width="800"/> 

---

## Project Overview

This project simulates a large-scale e-commerce order ingestion and prioritized processing pipeline:

- Generates up to 1.5M orders (configurable).
- Distinguishes VIP (DIAMOND tier) vs Normal orders and enforces strict priority: ALL VIP orders are processed before NORMAL orders enter the queue.
- Uses a Redis-backed queue (Bull) for scalable parallel processing.
- Persists orders and process execution metadata in MongoDB.
- Provides a rich monitoring & control dashboard (Next.js) with real-time insights.
- Supports cancellation, queue draining, system reset, and metrics persistence.

---

## Core Features

| Category | Features |
|----------|----------|
| Generation | High-volume generation (chunks), random tiers, auto priority mapping, bulk persistence |
| Priority Processing | Two-phase pipeline: VIP → drain → NORMAL |
| Queue | Bull (Redis), priority levels, concurrency control |
| Metrics | Generation time, enqueue times, per-priority processing windows, counts (processed only), total execution time |
| Lifecycle Tracking | State machine (phases) with introspection via API |
| Logging | File-based logs + retrieval endpoint with quick stats |
| Persistence | Execution runs stored (process_runs collection) |
| Control | Cancel active run (abort), pause/resume queue, clean states, reset everything |
| Frontend Dashboard | Status, health, queue metrics, logs viewer, job list, generation control, cancellation, reset |
| Safety | Guard against concurrent generation runs |
| Observability | Health endpoint, phase exposure, processed counters |

---

## Architecture

```
                        +----------------------------+
Client (Browser)  --->  | Next.js Dashboard (App Dir)|  (SSG + ISR + SWR)
                        +--------------+-------------+
                                       |
                                       | REST Calls (JSON)
                                       v
                        +-----------------------------+
                        |  NestJS Backend (API Layer) |
                        |  /pedidos endpoints         |
                        +--------------+--------------+
                                       |
                             Queue Job Enqueue
                                       |
                                       v
                          +---------------------+
                          |   Bull (Redis)      |
                          |  generateOrders     |
                          |  processOrder       |
                          +----------+----------+
                                     |
                     Bulk Insert / Updates to MongoDB
                                     |
                                     v
                          +---------------------+
                          |     MongoDB         |
                          |  orders / runs      |
                          +---------------------+
```

---

## Technology Stack

| Layer | Tools |
|-------|-------|
| Backend | NestJS, TypeScript, Bull (Redis), TypeORM (MongoDB driver), UUID |
| Queue | Redis |
| Database | MongoDB |
| Frontend | Next.js 15 (App Router), React 19, SWR, Tailwind CSS 4, Day.js |
| Logging | File-based (optional via env) |
| Deployment (optional) | Docker / Node PM2 / Containers |

---

## Repository Structure

```
ecommerce-orders-queue-challenge/
  nest-backend/
    src/
      application/
      domain/
      infrastructure/
      presentation/
      shared/
    .env
    README (backend details)
  next-ecommerce-orders-queue-challenge/
    src/
      app/
      components/
      lib/
    .env.local
    README (frontend dashboard)
```

---

## Backend (NestJS) Overview

Key Concepts:

- `GenerateOrdersUseCase`: Enqueues a single `generateOrders` job after validation.
- `OrdersProcessor`:
    - Generates order chunks (10k) with random tier → derive priority.
    - Immediately enqueues VIP orders while generating.
    - Waits until VIP job queue fully drains.
    - Enqueues NORMAL orders in batches only after VIP completion.
    - Waits for NORMAL queue drain.
    - Persists execution metrics.
- `LogsUseCase`: In-memory aggregation of metrics + persisted run storage.
- `OrderTypeOrmRepository`: MongoDB repository (bulk insert + update + count).
- `CancelProcessUseCase`: Cooperative abort with queue pause + purge + pending cleanup.
- `OrdersController`: Exposes all control/monitoring endpoints under `/pedidos`.

---

## Processing Lifecycle (Phases)

| Phase | Description |
|-------|-------------|
| `IDLE` | No active execution |
| `GENERATING` | Producing and persisting order chunks |
| `ENQUEUE_VIP` | (Interleaved) VIP orders being enqueued |
| `WAITING_VIP_DRAIN` | Waiting all VIP jobs to finish processing |
| `ENQUEUE_NORMAL` | After VIP drain, batching NORMAL enqueues |
| `WAITING_NORMAL_DRAIN` | Waiting NORMAL completion |
| `DONE` | Entire run finished |
| `ERROR` | Aborted or exception occurred |

---

## Data Model

### Order Document (`orders` collection)

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Logical identifier |
| cliente | string | Synthetic label |
| valor | number | Random monetary value |
| tier | enum (BRONZE, PRATA, OURO, DIAMANTE) | Customer tier |
| priority | enum (VIP, NORMAL) | Derived (DIAMANTE → VIP) |
| observacoes | string | Random + updated after processing |
| status | string | 'pendente' → processed state string |
| createdAt | Date | Timestamp |
| Indexes | (priority), (priority,status), (createdAt), unique(id) | Performance |

### Process Run Document (`process_runs`)

| Field | Description |
|-------|-------------|
| runId | Unique run identifier (UUID) |
| generationTimeMs | Total time generating orders |
| processingTimeVIPMs | VIP processing window |
| processingTimeNormalMs | NORMAL processing window |
| startVIP / endVIP | VIP processing boundaries |
| startNormal / endNormal | NORMAL processing boundaries |
| totalProcessedVIP / Normal | Counts of processed (status != pendente) |
| enqueueVipTimeMs / Normal | Enqueue durations |
| totalTimeMs | Aggregated time (gen + windows) |
| createdAt | Persistence timestamp |

---

## API Endpoints

Base Path: `/pedidos`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/pedidos/generate?quantity=NUM` | Start full pipeline (blocked if active) |
| POST | `/pedidos/cancel?purge=&removePending=&resetLogs=` | Abort active run |
| POST | `/pedidos/reset` | Full reset (DB + queue + metrics + history) |
| GET | `/pedidos` | Status & metrics (main dashboard source) |
| GET | `/pedidos/health/queue` | Queue & processor health |
| GET | `/pedidos/logs?lines=N` | Tail logs (info/warn/error) with quick stats |
| GET | `/pedidos/queue/status` | Raw queue counts |
| GET | `/pedidos/queue/jobs?types=waiting,active` | List jobs (lightweight view) |
| POST | `/pedidos/queue/pause` | Pause queue globally |
| POST | `/pedidos/queue/resume` | Resume queue |
| POST | `/pedidos/queue/clean?state=` | Clean specific job state |
| POST | `/pedidos/queue/close` | Close queue connection |
| POST | `/pedidos/process` | (Deprecated placeholder) |

---

## Execution Metrics & Logging

Collected Metrics:
- Generation time (ms)
- VIP processing window (start/end/time)
- NORMAL processing window (start/end/time)
- Enqueue times (VIP & NORMAL)
- Counts of processed (status != 'pendente')
- Total effective runtime: `generation + vipWindow + normalWindow`
- Phase transitions (real-time)
- Last persisted run ID

Log System (if `BACKEND_LOGS=true`):
- `shared/logs/log.messages`
- `shared/logs/warn.messages`
- `shared/logs/errors.messages`
- Retrieved via `/pedidos/logs`
- Quick stats: processed lines / VIP / NORMAL detection

---

## Cancellation & Reset Flow

### Cancellation (`POST /pedidos/cancel`)
Steps:
1. Set abort flag → phase = ERROR
2. Pause queue
3. Grace wait
4. Purge jobs (optional)
5. Delete pending orders (optional)
6. Reset logs (optional)
7. Return summary JSON

### Reset (`POST /pedidos/reset`)
- Purges queue states
- Deletes all orders
- Clears in-memory metrics
- Clears process_runs history
- Ready for a fresh run

---

## Frontend (Next.js) Dashboard

Folder: `next-ecommerce-orders-queue-challenge`

Features:
- CSR + ISR hybrid (SEO-friendly)
- SWR-based polling for status / health / logs / jobs
- Components:
    - StatusDashboard
    - HealthPanel
    - LogsViewer
    - QueueStatsCard
    - JobsTable
    - GenerateForm
    - CancelRunCard
    - ResetSystemCard
    - QueueControls
    - QueueCleanForm
- Phase badges & timeline bar visualization
- JSON-LD + meta tags for search indexing

---

## Environment Variables

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| MONGO_URI | (required) | Mongo connection URI |
| REDIS_HOST | localhost | Redis host |
| REDIS_PORT | 6379 | Redis port |
| PORT | 3000 | API port |
| BACKEND_LOGS | true | Enable file logs |
| MAX_ORDERS | 1500000 | Generation limit |
| ORDERS_QUEUE_CONCURRENCY | 25 | Worker concurrency |

### Frontend (.env.local)
| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_BACKEND_BASE_URL | http://localhost:3000 | Target API |
| NEXT_PUBLIC_DASHBOARD_REFRESH | 5000 | (ms) refresh interval |

---

## Running Locally

### Prerequisites
- Node 18+ (or 20+)
- Redis
- MongoDB
- pnpm (recommended)

### Steps

Backend:
```bash
cd nest-backend
cp env.example.txt .env   # if example exists; otherwise edit .env
pnpm install
pnpm start
```

Frontend:
```bash
cd next-ecommerce-orders-queue-challenge
cp env.example.txt .env.local
pnpm install
pnpm dev
```

Access:
- Dashboard: http://localhost:3000 (if frontend uses same port adjust!)
    - If port conflict: change frontend to 3001 with `pnpm dev --port 3001`
- API: http://localhost:3000/pedidos (if separate process, use different ports and set env accordingly)

---

## Docker (Optional)

High-level outline (not included as files here):
1. Create Dockerfile for backend:
    - Multi-stage: build → run
2. Create Dockerfile for frontend:
    - Multi-stage with `next build` then `next start`
3. docker-compose.yml with services:
    - backend
    - frontend
    - redis
    - mongo

---

## Performance Notes

Optimization strategies in place:
- Chunked generation (10k) to limit memory footprint
- Bulk insert (`insertMany`)
- Priority-based scheduling for queue fairness (VIP total precedence)
- Mongo indexing: `priority`, `(priority,status)`, `createdAt`
- Configurable concurrency

Potential future tuning:
- Replace per-order updates with `bulkWrite`
- Throughput measurement (orders/sec) via periodic snapshots
- Migrate to BullMQ for newer features
- Add horizontal scaling for processors (multiple instances)

---

## Troubleshooting

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Phase stuck in WAITING_VIP_DRAIN | Long VIP queue or stuck jobs | Check `/pedidos/health/queue`, inspect failed jobs |
| Counts not increasing | Generation not started | POST `/pedidos/generate` |
| Cancel doesn’t instantly stop | Cooperative abort: active jobs finishing | Wait briefly; then reset if needed |
| Many failed jobs | Redis/Mongo unreachable | Inspect `/pedidos/logs` |
| Cannot start new run | Phase not in IDLE/DONE/ERROR | Cancel or wait |
| Logs endpoint empty | BACKEND_LOGS=false | Enable and restart |

---

## Security Considerations

Current state:
- No auth (open control endpoints)
- Suitable for internal/demo environments

Recommended for production:
- Add API key / JWT guard on mutation endpoints (generate, cancel, reset, pause, resume)
- Rate limiting
- HTTPS enforcement
- Audit logging

---

## Roadmap / Future Enhancements

| Area | Idea |
|------|------|
| Observability | Prometheus /metrics exporter |
| Real-time | WebSocket / SSE for logs & phase changes |
| History | Endpoint: GET /pedidos/runs (list past executions) |
| UI | Throughput charts, error trend panels |
| Processing | Batch update processed orders to reduce write amplification |
| Reliability | Dead-letter queue for failed processing |
| Scaling | Multiple queue processors / dynamic concurrency |
| Analytics | Cost/time estimates, memory usage metrics |

---

## License

MIT License (customize as required).

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
...
```

---

### Quick Start Cheat Sheet

```bash
# Terminal 1 (Redis + Mongo via Docker)
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=pass \
  mongo:6

# Terminal 2 (Backend)
cd nest-backend
pnpm install
pnpm start

# Terminal 3 (Frontend)
cd next-ecommerce-orders-queue-challenge
pnpm install
pnpm dev --port 3001

# Trigger run
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

Enjoy exploring! 🚀