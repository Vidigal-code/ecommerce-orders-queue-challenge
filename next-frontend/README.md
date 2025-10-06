# E-commerce Orders Queue Challenge Frontend

**Test Case 1 - High-Performance Real-time Monitoring Dashboard**

Next.js 15 + React 19 frontend providing optimized real-time monitoring for the 1 million order processing challenge with efficient WebSocket communications.

## 🚀 Performance Highlights

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| **Real-time Updates** | Socket.IO WebSocket | Immediate status visibility |
| **Optimized Rendering** | React 19 + Optimistic UI | Smooth UI even during high-throughput processing |
| **Progressive Loading** | Chunked data reception | Handles 1M+ orders without UI freezing |
| **Reconnection Logic** | Automatic reconnect + backoff | Resilient during heavy processing |
| **Data Throttling** | Server-side emission control | Reduced network overhead |

---

## ✅ Challenge Requirements - 100% Compliance

### Real-time Monitoring Dashboard
- ✅ Displays detailed execution logs with timing and order counts
- ✅ Shows processing progress for VIP and normal orders separately
- ✅ Real-time updates via optimized WebSocket communications
- ✅ Visual progress bars and throughput metrics with live updates
- ✅ Phase-based status indicators with clear transitions
- ✅ Queue statistics and job monitoring with health checks
- ✅ System health monitoring with error detection
- ✅ Control buttons for generation, cancellation, and reset

### User Interface Components
- ✅ **Run Code Button**: Starts the 1M order generation and processing
- ✅ **Execution Log**: Real-time display of detailed logs with auto-scroll
- ✅ **Progress Tracking**: Visual progress bars and accurate ETA calculations
- ✅ **Metrics Display**: VIP/Normal processing counts, timing, and throughput
- ✅ **Queue Controls**: Pause, resume, clean, and detailed status operations
- ✅ **System Reset**: Complete database and queue reset with confirmation

### Real-time Data Flow
- ✅ Optimized Socket.IO WebSocket connection for high-frequency updates
- ✅ Automatic reconnection with exponential backoff during disconnections
- ✅ Robust data validation and error handling for incoming WebSocket messages
- ✅ Graceful degradation to API polling when WebSocket is temporarily unavailable
- ✅ Efficient client-side state management to prevent UI freezing

---

## 🛠️ Technical Implementation

### Core Technologies
- **Framework**: Next.js 15 with App Router architecture
- **UI**: React 19 + Tailwind CSS for responsive design
- **Real-time**: Socket.IO client with optimized connection handling
- **Data Fetching**: SWR for API calls with Incremental Static Regeneration
- **State Management**: React hooks with efficient WebSocket integration

### Key Components
- **StatusDashboard**: Main metrics display with real-time updates and optimized re-renders
- **GenerateForm**: Order generation controls with validation and error handling
- **LogsViewer**: Memory-efficient real-time log streaming with virtualized rendering
- **QueueStatsCard**: Detailed queue health and job statistics with priority differentiation
- **WebSocket Hook**: Manages real-time data connection

### Performance Features
- **ISR**: 15-second revalidation for non-real-time data
- **WebSocket**: Instant updates for processing status
- **Optimized Rendering**: Efficient React components
- **Error Boundaries**: Graceful error handling

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