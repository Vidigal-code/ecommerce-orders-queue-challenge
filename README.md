# 🚀 E-commerce Orders Queue Challenge - 100% Complete Solution

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11+-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.2+-red.svg)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.x-orange.svg)](https://docs.bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📋 Overview

This is a **production-ready, 100% compliant** implementation of the E-commerce Orders Queue Challenge. The system simulates a high-volume e-commerce platform that generates and processes **1 million orders** with priority-based queue processing, real-time monitoring, and comprehensive logging.

### ✨ Key Features

- 🎯 **1 Million Orders Generation** with random data (ID, customer, amount, tier, observations)
- 📊 **NoSQL Database** (MongoDB) with scalable architecture
- ⚡ **Priority Queue Processing** with BullMQ and Redis
- 👑 **VIP-First Processing** - All DIAMOND tier orders processed before others
- 🔄 **Real-time Updates** via WebSocket
- 📈 **Comprehensive Metrics** - Execution times, throughput, ETA
- 🎨 **Modern Dashboard** with Next.js 15 and React 19
- 🐳 **Complete Docker Orchestration** - Single command deployment
- 🏗️ **DDD Modular Architecture** - Clean, maintainable codebase
- 🔄 **System Reset** functionality for repeated testing

---

## 🎯 Challenge Compliance Matrix

| Requirement | Implementation | Status |
|------------|----------------|--------|
| **Generate 1M Orders** | Random generation with ID, customer, amount, tier, observations | ✅ 100% |
| **NoSQL Storage** | MongoDB with priority field differentiation | ✅ 100% |
| **Queue Processing** | BullMQ with batch processing | ✅ 100% |
| **VIP Priority** | DIAMOND orders processed first, then others | ✅ 100% |
| **Observation Field** | "sent with priority" (VIP) / "processed without priority" (NORMAL) | ✅ 100% |
| **Generation Time** | Tracked and returned via API | ✅ 100% |
| **Processing Times** | Separated by priority (VIP/NORMAL) | ✅ 100% |
| **Start/End Times** | Timestamped for each priority type | ✅ 100% |
| **Total Execution Time** | Complete process timing | ✅ 100% |
| **Order Counts** | VIP and NORMAL counts tracked | ✅ 100% |
| **Single GET Endpoint** | `/pedidos` returns all required data | ✅ 100% |
| **Detailed Logs** | Real-time logs with execution details | ✅ 100% |
| **Reset Functionality** | Complete database and queue reset | ✅ 100% |
| **Scalability** | Docker + BullMQ + Chunking | ✅ 100% |
| **UI Dashboard** | Real-time monitoring interface | ✅ 100% |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Orchestration              │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ MongoDB  │  │  Redis  │  │  Backend │  │  Frontend   │ │
│  │  :27017  │  │  :6379  │  │  :3000   │  │   :3001     │ │
│  └────┬─────┘  └────┬────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼─────────────┼────────────┼────────────────┼────────┘
        │             │            │                │
        │             │            │                │
┌───────▼─────────────▼────────────▼────────────────▼────────┐
│                     Application Flow                         │
├──────────────────────────────────────────────────────────────┤
│  1. Frontend (Next.js)                                       │
│     └─ User triggers generation via UI                       │
│                                                               │
│  2. Backend API (NestJS)                                     │
│     └─ POST /generate → Starts process                       │
│                                                               │
│  3. Order Generation Processor (BullMQ Job)                  │
│     ├─ Generate 1M orders in chunks (25k)                    │
│     ├─ Save to MongoDB with priority field                   │
│     └─ Emit real-time progress via WebSocket                 │
│                                                               │
│  4. VIP Queue Processing (Phase 1)                           │
│     ├─ Enqueue all DIAMOND tier orders                       │
│     ├─ Process with priority (10 concurrent workers)         │
│     ├─ Update observations: "sent with priority"             │
│     └─ Wait for complete VIP drain                           │
│                                                               │
│  5. Normal Queue Processing (Phase 2)                        │
│     ├─ Enqueue all BRONZE/SILVER/GOLD orders                 │
│     ├─ Process after ALL VIP orders complete                 │
│     ├─ Update observations: "processed without priority"     │
│     └─ Track timing and counts                               │
│                                                               │
│  6. Results & Monitoring                                     │
│     ├─ GET /pedidos → Returns all metrics                    │
│     ├─ WebSocket → Real-time updates to frontend            │
│     └─ Dashboard displays progress, logs, metrics            │
└──────────────────────────────────────────────────────────────┘
```

### 📂 Project Structure

```
ecommerce-orders-queue-challenge/
├── docker-compose.yml           # Unified orchestration (MongoDB, Redis, Backend, Frontend)
├── API.md                       # Complete API documentation
│
├── nest-backend/               # NestJS Backend
│   ├── Dockerfile              # Multi-stage production build
│   ├── src/
│   │   ├── domain/             # Domain entities and repositories
│   │   │   ├── entities/       # Order, ProcessRun entities
│   │   │   └── repositories/   # Repository interfaces
│   │   ├── application/        # Use cases (business logic)
│   │   │   └── use-cases/
│   │   ├── infrastructure/     # Infrastructure layer
│   │   │   ├── database/       # MongoDB TypeORM
│   │   │   ├── queue/          # BullMQ processors and services
│   │   │   ├── websocket/      # WebSocket gateway
│   │   │   └── metrics/        # Prometheus metrics
│   │   ├── presentation/       # Controllers and DTOs
│   │   └── shared/             # Shared utilities (logging, timing)
│   └── .env.example            # Environment variables template
│
├── next-frontend/              # Next.js Frontend
│   ├── Dockerfile              # Multi-stage production build
│   ├── src/
│   │   ├── app/                # Next.js 15 App Router
│   │   ├── components/         # React components
│   │   │   ├── StatusDashboard.tsx
│   │   │   ├── GenerateForm.tsx
│   │   │   ├── LogsViewer.tsx
│   │   │   └── ...
│   │   ├── hooks/              # Custom hooks
│   │   │   └── useWebSocket.ts # Real-time WebSocket integration
│   │   └── lib/                # API client and utilities
│   └── .env.example            # Frontend environment variables
│
└── mongodb-and-redis/          # Database initialization scripts
    ├── docker-compose.yml      # Standalone DB services (optional)
    └── mongo-init.js           # MongoDB initialization
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** installed
- **8GB RAM** minimum (12GB+ recommended for 1M orders)
- **Ports available**: 27017 (MongoDB), 6379 (Redis), 3000 (Backend), 3001 (Frontend)

### Option 1: Complete Docker Orchestration (Recommended) 🐳

```bash
# Clone the repository
git clone https://github.com/Vidigal-code/ecommerce-orders-queue-challenge.git
cd ecommerce-orders-queue-challenge

# Start all services with single command
docker compose up -d

# View logs
docker compose logs -f

# Access the application
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
# API Docs: http://localhost:3000/pedidos
```

**That's it! The system is ready.** 🎉

### Option 2: Development Mode (Local)

#### 1. Start Database Services

```bash
cd mongodb-and-redis
docker compose up -d
cd ..
```

#### 2. Setup Backend

```bash
cd nest-backend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env if needed

# Run in development mode
pnpm run start:dev

# Backend will be available at http://localhost:3000
```

#### 3. Setup Frontend

```bash
cd next-frontend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env if needed

# Run in development mode
pnpm run dev

# Frontend will be available at http://localhost:3001
```

---

## 📖 Usage

### 1. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3001
```

### 2. Generate and Process Orders

1. **Enter quantity** (default: 1,000,000)
2. **Click "Generate Orders"**
3. **Watch real-time progress** via WebSocket updates
4. **View metrics** as they update live

### 3. Monitor Progress

The dashboard displays:
- ✅ **Current Phase** (GENERATING, ENQUEUE_VIP, WAITING_VIP_DRAIN, etc.)
- 📊 **Progress Bar** with percentage
- ⏱️ **Execution Times** (Generation, VIP Processing, Normal Processing)
- 📈 **Throughput** (orders/second)
- 🎯 **ETA** (Estimated Time to Completion)
- 📝 **Real-time Logs**
- 🔢 **Order Counts** (VIP vs Normal)

### 4. Query Results via API

```bash
# Get complete status (Challenge requirement)
curl http://localhost:3000/pedidos

# Get detailed logs
curl http://localhost:3000/pedidos/logs

# Get queue statistics
curl http://localhost:3000/queue/counts

# Health check
curl http://localhost:3000/health/ready
```

### 5. Reset System

**Via Dashboard:**
- Click "Reset System" button

**Via API:**
```bash
curl -X POST http://localhost:3000/reset
```

---

## 🔧 Configuration

### Backend Environment Variables

See `nest-backend/.env.example` for full documentation. Key variables:

```bash
# Order Processing
MAX_ORDERS=1000000                    # Total orders to generate
GENERATION_CHUNK_SIZE=25000           # Chunk size for generation
ORDERS_QUEUE_CONCURRENCY=10           # Number of concurrent workers

# Database
MONGO_URI=mongodb://vidigalcode:test1234@mongodb:27017/ecommerce_orders?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379

# Performance
BULK_UPDATE_MODE=true                 # Use bulk updates for better performance
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

---

## 📊 API Documentation

Complete API documentation is available in [`API.md`](./API.md).

### Primary Endpoint (Challenge Requirement)

**GET `/pedidos`** - Returns all required information:

```json
{
  "generationTimeMs": 45230,
  "enqueueVipTimeMs": 1250,
  "enqueueNormalTimeMs": 8900,
  "processing": {
    "vip": {
      "start": "2025-10-01T10:15:30.123Z",
      "end": "2025-10-01T10:25:45.678Z",
      "timeMs": 615555,
      "count": 50000
    },
    "normal": {
      "start": "2025-10-01T10:25:45.678Z",
      "end": "2025-10-01T12:30:20.456Z",
      "timeMs": 7474778,
      "count": 950000
    }
  },
  "totalTimeMs": 8137713,
  "counts": {
    "vip": 50000,
    "normal": 950000
  },
  "phase": "DONE"
}
```

---

## 🎯 How It Meets The Challenge

### 1. **Order Generation** ✅
- Generates exactly 1,000,000 orders (configurable)
- Random fields: ID, customer, amount (10-1510), tier (BRONZE/SILVER/GOLD/DIAMOND)
- Distribution: DIAMOND (5%), GOLD (15%), SILVER (30%), BRONZE (50%)
- Stored in MongoDB with `priority` field

### 2. **Priority Queue Processing** ✅
- **BullMQ** for robust queue management
- **Two-phase processing**:
  - Phase 1: ALL VIP (DIAMOND) orders processed first
  - Phase 2: NORMAL orders only start after ALL VIP complete
- **Enforcement**: NORMAL jobs check if VIP processing is complete before executing

### 3. **Observation Field Updates** ✅
- VIP orders: `"sent with priority"`
- Normal orders: `"processed without priority"`

### 4. **Comprehensive Logging** ✅
- Generation time tracked
- Processing times separated by priority
- Start and end timestamps for each priority
- Total execution time
- Order counts (VIP vs Normal)
- Real-time progress via WebSocket

### 5. **Single GET Endpoint** ✅
- `/pedidos` returns ALL required information
- Alternative `/orders` endpoint with extended data

### 6. **Reset Functionality** ✅
- Clears MongoDB collections
- Drains and obliterates queues
- Resets in-memory state
- Allows repeated testing

### 7. **Scalability** ✅
- Chunked generation (25k orders per chunk)
- Batch enqueueing
- Concurrent processing (10 workers)
- Bulk database updates
- Memory-efficient streaming

### 8. **Real-time Monitoring** ✅
- WebSocket for live updates
- Progress bar with percentage
- Throughput calculation (orders/second)
- ETA estimation
- Phase tracking

---

## 🧪 Testing

### Run Backend Tests

```bash
cd nest-backend
pnpm test                # Unit tests
pnpm test:e2e           # E2E tests
pnpm test:cov           # Coverage report
```

### Manual Testing Flow

1. **Start system**: `docker compose up`
2. **Access dashboard**: `http://localhost:3001`
3. **Generate orders**: Click "Generate Orders" with 1,000,000
4. **Verify phases**:
   - GENERATING
   - ENQUEUE_VIP
   - WAITING_VIP_DRAIN
   - ENQUEUE_NORMAL
   - WAITING_NORMAL_DRAIN
   - DONE
5. **Check results**: `curl http://localhost:3000/pedidos`
6. **Verify database**:
   ```bash
   docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234
   use ecommerce_orders
   db.orders.countDocuments({ priority: "VIP" })
   db.orders.countDocuments({ priority: "NORMAL" })
   db.orders.findOne({ priority: "VIP" })
   ```
7. **Reset**: Click "Reset System"
8. **Repeat**: Run again to verify reset functionality

---

## 🐛 Troubleshooting

### System doesn't start

```bash
# Check Docker services
docker compose ps

# View logs
docker compose logs backend
docker compose logs frontend

# Restart services
docker compose restart
```

### Backend can't connect to MongoDB

```bash
# Check MongoDB is running
docker compose logs mongodb

# Verify MongoDB connection
docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234
```

### Queue processing stuck

```bash
# Check Redis
docker exec -it ecommerce-redis redis-cli ping

# View queue status
curl http://localhost:3000/queue/counts

# Cancel and restart
curl -X POST http://localhost:3000/cancel
curl -X POST http://localhost:3000/reset
```

### Out of memory errors

Reduce configuration:
```bash
MAX_ORDERS=100000                    # Instead of 1M
GENERATION_CHUNK_SIZE=10000          # Smaller chunks
ORDERS_QUEUE_CONCURRENCY=5           # Fewer workers
```

---

## 📈 Performance Benchmarks

**Test Environment**: 16GB RAM, 8 CPU cores, SSD

| Metric | Value |
|--------|-------|
| Orders Generated | 1,000,000 |
| Generation Time | ~45 seconds |
| VIP Orders (5%) | 50,000 |
| VIP Processing Time | ~10 minutes |
| Normal Orders (95%) | 950,000 |
| Normal Processing Time | ~2 hours |
| Total Execution Time | ~2.2 hours |
| Average Throughput | ~125 orders/second |
| Peak Memory Usage | ~2.5 GB |

---

## 🤝 Contributing

This project is a challenge implementation. Feel free to fork and improve!

---

## 👤 Author

**Vidigal Code**
- GitHub: [@Vidigal-code](https://github.com/Vidigal-code)
- Repository: [ecommerce-orders-queue-challenge](https://github.com/Vidigal-code/ecommerce-orders-queue-challenge)

---

## 📄 License

UNLICENSED - This is a challenge implementation project.

---

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **BullMQ** - Premium Queue for Node.js
- **MongoDB** - NoSQL database
- **Redis** - In-memory data structure store
- **Next.js** - React framework for production
- **Docker** - Containerization platform

---

## ⭐ Star This Repository

If you found this implementation helpful, please give it a star! ⭐

