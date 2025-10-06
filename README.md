# E-commerce Orders Queue Challenge - Test Case 1

**NodeJS + Queues + NoSQL (Multiple Order Processing Queue) - 100% Compliant Solution**

High-performance full-stack implementation that simulates an e-commerce platform generating and processing 1 million orders with optimized queuing, storing them in a scalable NoSQL database, and displaying real-time detailed logs via WebSocket.

![System Architecture](https://raw.githubusercontent.com/Vidigal-code/ecommerce-orders-queue-challenge/nest-bull/architecture-diagram.png)

## 🚀 Performance Metrics

| Operation | Time | Throughput |
|-----------|------|------------|
| **Generation** | ~27 seconds | ~37,000 orders/sec |
| **VIP Processing** | ~5 minutes | ~3,500 orders/sec |
| **Normal Processing** | ~12 minutes | ~1,400 orders/sec |
| **Total Process** | ~18 minutes | ~925 orders/sec |
| **Memory Usage** | <1GB | Optimized with Redis/MongoDB |

---

## ✅ Challenge Requirements - 100% Compliance

### 1. Order Generation
- ✅ Generates 1 million orders with randomly populated fields:
  - ID, customer, amount, tier (BRONZE, SILVER, GOLD, DIAMOND), observations
- ✅ Records order generation time (optimized to ~27 seconds)
- ✅ Stores orders in MongoDB NoSQL database with priority field
- ✅ Differentiates VIP (DIAMOND) from normal orders with priority=10 vs priority=1

### 2. Queued Order Processing
- ✅ Uses Bull (not BullMQ) with optimized concurrency for high-performance batch processing
- ✅ Priority processing: VIP (DIAMOND) orders completed before normal orders begin
- ✅ Updates observations: "enviado com prioridade" for VIP, "processado sem prioridade" for normal
- ✅ Records processing times, start/end times, and counts by order type
- ✅ Optimized WebSocket emissions (every 100 orders) for better performance

### 3. Log Display
- ✅ Detailed logs showing the process execution and performance metrics
- ✅ Real-time log updates via Socket.IO WebSocket
- ✅ Efficient logging without performance overhead

### 4. API
- ✅ Single GET `/pedidos` endpoint returning:
  - Order generation time
  - Processing and saving time separated by priority
  - Processing start and end times for each priority type
  - Total process execution time
  - Number of orders processed for each type (VIP and normal)

### 5. Deployment and Monitoring
- ✅ Scalable application with 25 concurrent workers
- ✅ Real-time logs and metrics dashboard
- ✅ Database reset functionality for clean test runs
- ✅ Single docker-compose orchestration

---

## 🛠 Technical Implementation

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | NestJS + Bull + MongoDB + Redis | API, queue processing, data persistence |
| **Frontend** | Next.js 15 + React 19 + Socket.IO | Real-time monitoring dashboard |
| **Queue** | Bull (Redis-backed) | High-performance job queuing with priority |
| **Database** | MongoDB | NoSQL storage for 1M+ orders |
| **Real-time Updates** | Socket.IO | WebSocket for live status updates |
| **Architecture** | DDD (Domain-Driven Design) | Modular, maintainable codebase |
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