# E-commerce Orders Queue Challenge - Test Case 1

**NodeJS + Queues + NoSQL (Multiple Order Processing Queue) - Mandatory**

Full-stack implementation that simulates an e-commerce platform generating and processing 1 million orders, storing them in a scalable NoSQL database, and displaying detailed logs with execution time and order counts.

---

## Challenge Requirements - 100% Compliance

### 1. Order Generation
- ✅ Generate 1 million orders with randomly populated fields:
  - ID, customer, amount, tier (BRONZE, SILVER, GOLD, DIAMOND), observations
- ✅ Record order generation time
- ✅ Store orders in MongoDB NoSQL database with priority field
- ✅ Differentiate VIP (DIAMOND) from normal orders

### 2. Queued Order Processing
- ✅ Use Bull (not BullMQ) for batch processing
- ✅ Priority processing: VIP (DIAMOND) orders completed before normal orders begin
- ✅ Update observations: "sent with priority" for VIP, "processed without priority" for normal
- ✅ Record processing times, start/end times, and counts by order type

### 3. Log Display
- ✅ Detailed logs showing the process execution
- ✅ Real-time log updates via WebSocket

### 4. API
- ✅ Single GET `/orders` endpoint returning:
  - Order generation time
  - Processing and saving time separated by priority
  - Processing start and end times for each priority type
  - Total process execution time
  - Number of orders processed for each type (VIP and normal)

### 5. Deployment and Monitoring
- ✅ Scalable application architecture
- ✅ Logs displayed in real-time interface
- ✅ Database reset functionality for re-running tests

---

## Technical Implementation

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | NestJS + Bull + MongoDB + Redis | API, queue processing, data persistence |
| **Frontend** | Next.js 15 + React 19 + Socket.IO | Real-time monitoring dashboard |
| **Queue** | Bull (Redis-backed) | High-performance job queuing with priority |
| **Database** | MongoDB | NoSQL storage for 1M+ orders |
| **Real-time** | Socket.IO WebSocket | Live status updates and progress |

---

## Performance Optimizations

- **Chunk Processing**: 50,000 orders per chunk for optimal memory usage
- **Concurrency**: 25 concurrent workers for maximum throughput
- **Memory**: 1GB Redis cache, optimized for high-volume processing
- **Batch Operations**: Bulk database operations for efficiency
- **WebSocket**: Real-time updates without polling overhead

---

## Architecture Highlights

### DDD Modular Architecture
- **Domain Layer**: Business entities and repository interfaces
- **Application Layer**: Use cases orchestrating business logic
- **Infrastructure Layer**: External concerns (DB, Queue, WebSocket)
- **Presentation Layer**: REST API and DTOs

### Queue Processing Flow
1. **Generation Phase**: Create 1M orders with random data
2. **VIP Processing**: Process all DIAMOND tier orders first
3. **Normal Processing**: Process remaining orders after VIP completion
4. **Real-time Updates**: WebSocket broadcasts progress and metrics

### Data Flow
```
Frontend (Next.js) ↔ WebSocket ↔ NestJS API ↔ Bull Queue ↔ Redis
                                      ↘
                                       MongoDB (Orders Storage)
```

---

## High-Level Architecture

```
User / Dashboard (Next.js)
        |
        v
  GET/POST /pedidos (NestJS)
        |
   +----+------------------------------+
   |  OrdersProcessor (Bull Consumer)  |
   |  - Generate chunks (10k)          |
   |  - Enqueue VIP as generated       |
   |  - Wait VIP drain                 |
   |  - Enqueue NORMAL                 |
   |  - Wait NORMAL drain              |
   +----------------+------------------+
                    |
          MongoDB (orders, process_runs)
                    |
                Redis (Bull queue)
```

---

## Processing Lifecycle (Phases)

1. `IDLE` – Waiting
2. `GENERATING` – Creating + inserting orders
3. `ENQUEUE_VIP` – Streaming VIP jobs to queue
4. `WAITING_VIP_DRAIN` – Ensuring VIP fully processed
5. `ENQUEUE_NORMAL` – Bulk enqueue NORMAL orders
6. `WAITING_NORMAL_DRAIN` – Waiting NORMAL completion
7. `DONE` – Success
8. `ERROR` – Exception or manual abort

---

## Data Model (Backend)

### Order Document (collection: `orders`)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Logical ID |
| cliente | string | Random label |
| valor | number | Random value |
| tier | enum: BRONZE / PRATA / OURO / DIAMANTE | Source of priority |
| priority | enum: VIP / NORMAL | Derived |
| observacoes | string | Initial random phrase + updated after processing |
| status | string | 'pendente' → final status message |
| createdAt | Date | Timestamp |
| Indexes | id (unique), priority, (priority,status), createdAt | Performance |

### ProcessRun (collection: `process_runs`)
Stores historical metrics (timings, counts, enqueue durations, runId, timestamps).

---

## Main API (GET /pedidos)

Example response fields (simplified):
```json
{
  "generationTimeMs": 8423,
  "enqueueVipTimeMs": 1300,
  "enqueueNormalTimeMs": 2945,
  "processing": {
    "vip": {
      "start": "2025-09-29T11:10:01.400Z",
      "end": "2025-09-29T11:10:25.900Z",
      "timeMs": 24500,
      "count": 250000
    },
    "normal": {
      "start": "2025-09-29T11:10:26.050Z",
      "end": null,
      "timeMs": 0,
      "count": 0
    }
  },
  "totalTimeMs": 32923,
  "counts": {
    "vip": 250000,
    "normal": 0
  },
  "phase": "WAITING_NORMAL_DRAIN",
  "lastRunId": "c2d5baf0-..."
}
```

---

## Other Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/pedidos/generate?quantity=1000000` | Start full pipeline |
| POST | `/pedidos/cancel?purge=true&removePending=true` | Abort current run |
| POST | `/pedidos/reset` | Wipe DB + queue + metrics |
| GET | `/pedidos/health/queue` | Queue & processor health |
| GET | `/pedidos/logs?lines=300` | Tail logs + quick stats |
| GET | `/pedidos/queue/status` | Queue counters |
| GET | `/pedidos/queue/jobs?types=waiting,active` | Job listing |
| POST | `/pedidos/queue/pause` | Pause queue |
| POST | `/pedidos/queue/resume` | Resume queue |
| POST | `/pedidos/queue/clean?state=wait` | Clean state |
| POST | `/pedidos/process` | (Deprecated placeholder) |

---

## Cancellation & Reset

### Cancel
- Cooperative abort (sets internal flag)
- Pauses queue, optional purge, deletes pending, leaves processed metrics
- Sets phase to `ERROR`

### Reset
- Purges queue
- Deletes all documents in `orders`
- Clears historical runs
- Resets in-memory metrics/log structures

---

## Logging & Metrics

- In-memory + persisted per-run
- File logs (if enabled via env) separated by level
- Quick stats extracted (VIP vs NORMAL processed) from log lines
- Metrics persisted even on error/abort (best-effort)

---

## Frontend Dashboard (Next.js)

Capabilities:
- Start generation
- View live phase & counts (SWR polling + ISR fallback)
- Cancel / Reset / Pause / Resume / Clean queue
- Logs viewer (info/warn/error columns)
- Job inspection (waiting/active/failed)
- Timeline segment bar (Generation vs VIP vs NORMAL)
- Phase badge
- SEO-aware metadata + structured JSON-LD

---

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| MONGO_URI | (required) | Mongo connection |
| REDIS_HOST | localhost | Redis host |
| REDIS_PORT | 6379 | Redis port |
| PORT | 3000 | HTTP port |
| BACKEND_LOGS | true | Enable file logs |
| MAX_ORDERS | 1500000 | Safety cap |
| ORDERS_QUEUE_CONCURRENCY | 25 | Worker concurrency |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_BACKEND_BASE_URL | http://localhost:3000 | API base |
| NEXT_PUBLIC_DASHBOARD_REFRESH | 5000 | Poll interval (ms) |

---

## Running Locally (Quick Start)

```bash
# 1. Infrastructure
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name mongo -p 27017:27017 mongo:6

# 2. Backend
cd nest-backend
cp .env.example .env   # if present
pnpm install
pnpm start

# 3. Frontend
cd ../next-frontend
cp .env.example .env.local  # if present
pnpm install
pnpm dev --port 3001

# 4. Start a run
curl -X POST "http://localhost:3000/pedidos/generate?quantity=1000000"
```

Dashboard (default): http://localhost:3001  
API Base: http://localhost:3000/pedidos

---

## Performance & Scalability Notes

Implemented:
- Chunked generation (10k) to avoid memory spikes
- Bulk insert (`insertMany`)
- Strict priority separation (VIP fully processed first)
- Index-assisted processed counts
- Concurrency tuning via env

Potential future improvements:
- Bulk write for status updates
- Throughput measurement (orders/sec)
- Horizontal scaling (multiple workers)
- Streaming logs (WebSocket/SSE)

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Stuck in `WAITING_VIP_DRAIN` | VIP queue still processing | Check `/pedidos/health/queue` |
| Counts not increasing | Generation not started | POST `/pedidos/generate` |
| Cancel “slow” | Cooperative abort (active tasks finishing) | Wait or force reset |
| High failures | Redis / Mongo instability | Inspect `/pedidos/logs` |
| Cannot start new run | Active phase not finished | Cancel or await completion |
| Logs empty | Logging disabled | Enable `BACKEND_LOGS=true` |

---

## Future Enhancements

- `/pedidos/runs` listing with pagination
- Prometheus `/metrics`
- WebSocket live phase/log streaming
- Auth (API key / JWT)
- Dead-letter queue
- UI charts (throughput, failures over time)
- Resumable partial runs

---

## License

MIT (adjust as needed).

---

## Acknowledgements

Built as a comprehensive solution to the “NodeJS + Queue + NoSQL – High Volume Order Processing” challenge, focusing on correctness, observability, priority enforcement, and operational clarity.

---

### Quick Cheat Sheet

```bash
POST /pedidos/generate?quantity=1000000   # start
POST /pedidos/cancel                      # abort
POST /pedidos/reset                       # wipe
GET  /pedidos                             # status
GET  /pedidos/logs?lines=300              # logs
GET  /pedidos/health/queue                # health
```

Enjoy! 🚀