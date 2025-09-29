# E-commerce Orders Queue Challenge (NestJS + Bull + MongoDB + Redis)

## Table of Contents
- [Challenge Description](#challenge-description)
- [Goals Achieved](#goals-achieved)
- [High-Level Architecture](#high-level-architecture)
- [End-to-End Processing Flow (Phases)](#end-to-end-processing-flow-phases)
- [Data Model](#data-model)
- [Order Generation Strategy](#order-generation-strategy)
- [Priority Processing (VIP → NORMAL)](#priority-processing-vip--normal)
- [Queue & Concurrency](#queue--concurrency)
- [Logs, Metrics & Execution History](#logs-metrics--execution-history)
- [Safe Cancellation Flow](#safe-cancellation-flow)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Usage Examples (curl)](#usage-examples-curl)
- [Health & Monitoring](#health--monitoring)
- [Scalability & Performance Notes](#scalability--performance-notes)
- [Technical Decisions & Rationale](#technical-decisions--rationale)
- [Troubleshooting](#troubleshooting)
- [Potential Future Enhancements](#potential-future-enhancements)
- [License](#license)

---

## Challenge Description

The goal of this challenge is to simulate a large-scale e-commerce order ingestion and processing pipeline that:

1. Generates 1,000,000+ randomized orders.
2. Distinguishes VIP (DIAMOND tier) from NORMAL priority orders.
3. Uses a queue system (Bull + Redis) to process all VIP orders first, then NORMAL.
4. Tracks generation time, queue enqueue times, processing times (VIP & NORMAL), total processed counts, and global execution time.
5. Provides a single status endpoint (`GET /pedidos`) returning consolidated metrics.
6. Persists execution history for audit/comparison.
7. Supports reset & safe cancellation mid-run.
8. Exposes logs for evaluation and transparency.

---

## Example

<img src="/nest-backend/example/nest-example.png" alt="" width="800"/> 

---

## Goals Achieved

| Requirement | Status |
|-------------|--------|
| Generate ≥ 1M orders with random data | ✅ |
| Priority classification (DIAMOND → VIP) | ✅ |
| Scalable NoSQL storage (MongoDB) | ✅ |
| Queue-based processing with priority | ✅ |
| Strict VIP-before-NORMAL processing | ✅ |
| Status + observation updates per priority | ✅ |
| Precise timing metrics (generation, VIP window, NORMAL window) | ✅ |
| Total processed count per priority (completed only) | ✅ |
| Enqueue timing (VIP & NORMAL) | ✅ |
| Single consolidated status endpoint | ✅ |
| Logs retrievable via API | ✅ |
| Health check of queue & processor | ✅ |
| Reset functionality | ✅ |
| Safe cancellation (abort + purge + cleanup) | ✅ |
| Prevention of concurrent generation runs | ✅ |
| Execution history persistence | ✅ |

---

## High-Level Architecture

Components:

- **NestJS**: Layered architecture (Domain / Application / Infrastructure / Presentation).
- **MongoDB**: Order + execution metrics persistence.
- **Redis**: Queue backend (Bull).
- **Bull (v3)**: Job scheduling for generation + order processing.
- **File-based logging** (optional via `BACKEND_LOGS=true`).
- **Execution metrics** persisted to `process_runs`.

### Simplified Architecture Diagram

```
Client ──► POST /pedidos/generate
             │
             ▼
        Controller
             │
             ▼
         Use Case
             │ add job (generateOrders)
             ▼
          Bull Queue (Redis)
             │
   ┌─────────┴─────────┐
   │ OrdersProcessor    │
   │  - Generate chunks │
   │  - Enqueue VIP     │
   │  - Wait drain      │
   │  - Enqueue NORMAL  │
   │  - Wait drain      │
   └─────────┬─────────┘
             │ bulk insert / updates
             ▼
          MongoDB
```

---

## End-to-End Processing Flow (Phases)

Phases are exposed via `/pedidos` and `/pedidos/health/queue`:

| Phase | Meaning |
|-------|---------|
| `IDLE` | Waiting for a run |
| `GENERATING` | Producing order chunks |
| `ENQUEUE_VIP` | Enqueuing VIP batches during generation |
| `WAITING_VIP_DRAIN` | Waiting VIP queue to finish |
| `ENQUEUE_NORMAL` | Enqueuing NORMAL after VIP drain |
| `WAITING_NORMAL_DRAIN` | Waiting NORMAL queue to finish |
| `DONE` | Run finished |
| `ERROR` | Error or aborted |

---

## Data Model

### Order (collection: `orders`)

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Logical ID |
| cliente | string | Simulated client name |
| valor | number | Random price |
| tier | enum (BRONZE / PRATA / OURO / DIAMANTE) | Customer tier |
| priority | enum (VIP / NORMAL) | Derived from tier (DIAMANTE → VIP) |
| observacoes | string | Random note + updated after processing |
| status | string | 'pendente' → final processed state |
| createdAt | Date | Creation timestamp |

Indexes:
- Unique: `id`
- `priority`
- Composite: `priority + status`
- `createdAt`

### ProcessRun (collection: `process_runs`)

| Field | Description |
|-------|-------------|
| runId | UUID of execution |
| generationTimeMs | Total time generating orders |
| processingTimeVIPMs | Window from first VIP start to last VIP processed |
| processingTimeNormalMs | Window for NORMAL |
| startVIP / endVIP | Boundaries of VIP processing |
| startNormal / endNormal | Boundaries of NORMAL processing |
| totalProcessedVIP / totalProcessedNormal | Counts of processed (not just inserted) |
| enqueueVipTimeMs / enqueueNormalTimeMs | Total enqueue durations |
| totalTimeMs | Aggregated sum |
| createdAt | Persisted timestamp |

---

## Order Generation Strategy

- Chunk size: 10,000 (reduces memory pressure).
- Random fields: tier, price, observation.
- Derived priority: `tier === DIAMANTE ? VIP : NORMAL`.
- VIP orders are enqueued during generation; NORMAL orders are delayed until VIP queue drains.
- Bulk insertion using `insertMany` improves storage efficiency.

---

## Priority Processing (VIP → NORMAL)

1. Generate chunk(s) and immediately enqueue VIP orders.
2. Wait for all VIP jobs to finish (`WAITING_VIP_DRAIN`).
3. Enqueue all NORMAL orders in batches.
4. Wait for NORMAL queue to drain.
5. Mark final metrics and persist run.

---

## Queue & Concurrency

- Queue name: `orders-queue`.
- Jobs:
    - `generateOrders`: Single macro job controlling everything.
    - `processOrder`: One per order.
- Priority mapping:
    - VIP → priority `1`
    - NORMAL → priority `2`
- Concurrency: Configurable via `ORDERS_QUEUE_CONCURRENCY` (default 25).
- Strategy ensures FIFO within priority groups.

---

## Logs, Metrics & Execution History

### Metrics (in-memory via LogsUseCase)
- Generation time.
- VIP & NORMAL processing windows (start/end + duration).
- Enqueue timings.
- Phase.
- Incremental processed counts (via filtered DB queries).

### Logs
If `BACKEND_LOGS=true`:
- `shared/logs/log.messages`
- `shared/logs/warn.messages`
- `shared/logs/errors.messages`

Access via:
```
GET /pedidos/logs?lines=500
```

### Historical Persistence
- Each run is saved in `process_runs`.
- Includes timing + processed counts + enqueue durations.

---

## Safe Cancellation Flow

Endpoint: `POST /pedidos/cancel`

Query parameters:
| Param | Default | Description |
|-------|---------|-------------|
| purge | true | Clear queue states (wait/active/etc.) |
| removePending | true | Delete orders still in 'pendente' status |
| resetLogs | false | Reset in-memory metrics |

Behavior:
1. Set internal `aborted` flag.
2. Transition phase to `ERROR`.
3. Pause queue.
4. Short grace sleep.
5. Optionally purge queue + remove pending orders.
6. Optionally reset metrics.

After cancellation you can safely start a new run.

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/pedidos/generate?quantity=NUM` | Starts full pipeline (guarded: no parallel runs) |
| GET | `/pedidos` | Consolidated metrics + phase + counts |
| GET | `/pedidos/health/queue` | Operational queue + processor health |
| GET | `/pedidos/logs?lines=N` | Tail of log/warn/error files |
| POST | `/pedidos/cancel` | Abort active generation (with options) |
| POST | `/pedidos/reset` | Clears DB + queue + metrics |
| POST | `/pedidos/queue/pause` | Pause queue globally |
| POST | `/pedidos/queue/resume` | Resume queue |
| POST | `/pedidos/queue/clean?state=wait` | Clean one state |
| POST | `/pedidos/queue/close` | Close queue connection |
| GET | `/pedidos/queue/status` | Raw queue counts |
| GET | `/pedidos/queue/jobs?types=waiting,active` | List jobs summary |
| POST | `/pedidos/process` | (Deprecated) – retained for compatibility |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | (required) | MongoDB connection URI |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3000` | HTTP port |
| `BACKEND_LOGS` | `true` | Enables file logging |
| `MAX_ORDERS` | `1500000` | Generation upper limit |
| `ORDERS_QUEUE_CONCURRENCY` | `25` | Processing worker concurrency |

---

## Running Locally

Prerequisites:
- Node 18+
- Redis
- MongoDB
- pnpm (recommended)

```bash
# 1. Install dependencies
pnpm install

# 2. Run infrastructure (example via Docker)
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=vidigalcode \
  -e MONGO_INITDB_ROOT_PASSWORD=test1234 \
  mongo:6

# 3. Configure .env
cp .env.example .env   # (if you have an example)
# or create manually

# 4. Start application
pnpm start

# 5. Kick off generation
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

---

## Usage Examples (curl)

Generate 500k orders:
```bash
curl -X POST "http://localhost:3000/pedidos/generate?quantity=500000"
```

Monitor status:
```bash
curl "http://localhost:3000/pedidos" | jq
```

Health:
```bash
curl "http://localhost:3000/pedidos/health/queue" | jq
```

Tail logs (last 300 lines):
```bash
curl "http://localhost:3000/pedidos/logs?lines=300" | jq
```

Cancel in-progress:
```bash
curl -X POST "http://localhost:3000/pedidos/cancel?purge=true&removePending=true&resetLogs=false"
```

Reset everything:
```bash
curl -X POST "http://localhost:3000/pedidos/reset"
```

List waiting & active jobs:
```bash
curl "http://localhost:3000/pedidos/queue/jobs?types=waiting,active"
```

Pause queue:
```bash
curl -X POST "http://localhost:3000/pedidos/queue/pause"
```

Resume queue:
```bash
curl -X POST "http://localhost:3000/pedidos/queue/resume"
```

---

## Health & Monitoring

`GET /pedidos/health/queue` returns:
- Queue counts: waiting, active, completed, failed, delayed
- Processor phase
- Flags: `isProcessing`, `aborting`, `hasFailedJobs`, `paused`
- Enqueue timings
- Status classification: `healthy | degraded | paused | unhealthy`

Use cases:
- Detect stuck state (active > 0 but phase not in processing set).
- Watch high failure rates.
- Observe phase transitions during runtime.

---

## Scalability & Performance Notes

Implemented strategies:
- Chunked generation reduces memory footprint.
- Bulk insertion (`insertMany`) improves ingestion throughput.
- Queue concurrency adjustable based on system capacity.
- Priority strictly enforced (VIP first).
- Indexed queries for processed counts.

Possible load considerations:
- Single-document updates per order may become a bottleneck at extreme scale; a future optimization would be `bulkWrite`.
- Throughput is sensitive to Redis + Mongo latency; co-locate for minimal RTT.
- CPU bound? Increase `ORDERS_QUEUE_CONCURRENCY` gradually (monitor load).

---

## Technical Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Two-phase design (VIP then NORMAL) | Guarantees strict priority ordering |
| In-memory + DB counting | Real-time plus persisted validation |
| File-based logging | Transparency without requiring external stack |
| Optimistic chunk loop | Simple control + good memory characteristics |
| Status-based processed count | Avoids misleading "inserted vs processed" metrics |
| Abort via flag (cooperative) | Prevents partial corruption vs hard kill |
| Execution history persistence | Enables benchmarking and run-to-run comparison |
| Phase machine | Improves observability for UI/monitoring |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Redis connection refused | Redis not running or wrong host | Start Redis / check `REDIS_HOST` |
| Mongo auth failure | Wrong credentials / URI | Verify `MONGO_URI` |
| Stuck in `WAITING_VIP_DRAIN` | VIP jobs still active or stuck | Check `/pedidos/health/queue` failed jobs |
| Counts stay zero | Generation not started | Use `POST /pedidos/generate` |
| Cancel doesn't instantly stop | Active jobs finishing | Wait briefly; then `reset` if needed |
| Many failed jobs | Env instability (Redis/Mongo) | Inspect `/pedidos/logs` |
| Cannot start new run | Another run active | Cancel or wait until DONE/ERROR |

---

## Potential Future Enhancements

- Prometheus metrics (`/metrics`) (throughput, durations, job lag).
- Switch to BullMQ (modern API, better scalability).
- Aggregate batch updates for processed orders.
- Resume from partial state after restart (persist phase & snapshot).
- WebSocket/Server-Sent Events for live logs.
- UI dashboard (React/Next) showing live counters.
- Throughput calculation (orders/sec per phase).
- Dead-letter queue for failures.
- Multi-tenancy (separate queues per tenant).

---

## License

MIT License (example). Feel free to adapt.

```
MIT License - Permission is hereby granted, free of charge, to any person obtaining a copy...
```

---

