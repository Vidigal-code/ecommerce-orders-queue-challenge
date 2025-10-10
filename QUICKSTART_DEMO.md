# 🚀 Quick Start Guide

## Run the Complete System

### Option 1: Docker Compose (Recommended)

```powershell
# From project root
cd 'd:\GITHUB REPOSITORY\ecommerce-orders-queue-challenge'

# Build and start all services
docker compose up --build

# Services will be available at:
# - Frontend Dashboard: http://localhost:3001
# - Backend API: http://localhost:3000
# - MongoDB: localhost:27017
# - Redis: localhost:6379
```

### Option 2: Manual Development Mode

**Terminal 1 - Start MongoDB & Redis:**
```powershell
cd 'd:\GITHUB REPOSITORY\ecommerce-orders-queue-challenge\mongodb-and-redis'
docker compose up
```

**Terminal 2 - Start Backend:**
```powershell
cd 'd:\GITHUB REPOSITORY\ecommerce-orders-queue-challenge\nest-backend'
pnpm install
pnpm run start:dev
```

**Terminal 3 - Start Frontend:**
```powershell
cd 'd:\GITHUB REPOSITORY\ecommerce-orders-queue-challenge\next-frontend'
pnpm install
pnpm run dev
```

---

## Test Case 1 Demonstration

### 1. Access Dashboard
Navigate to: **http://localhost:3001**

### 2. Generate Orders
1. Click **"Generate Orders"** button
2. Enter quantity: `1000000` (1 million)
3. Click **"Start Generation"**
4. Watch real-time progress

### 3. Monitor Processing
- **Dashboard** shows:
  - Generation time
  - VIP processing (DIAMOND orders)
  - Normal processing (BRONZE/SILVER/GOLD)
  - Total execution time
  - Orders processed per type
  
- **Logs Tab** displays:
  - Detailed execution logs
  - Timestamps for each phase
  - Error tracking (if any)

### 4. Verify Results
**API Endpoint:**
```powershell
# Get complete status
curl http://localhost:3000/pedidos

# Get logs
curl http://localhost:3000/pedidos/logs

# Health checks
curl http://localhost:3000/pedidos/health/live
curl http://localhost:3000/pedidos/health/ready
```

**Expected Response:**
```json
{
  "processing": {
    "vip": {
      "startTime": "2025-10-10T12:00:00.000Z",
      "endTime": "2025-10-10T12:01:30.000Z",
      "timeMs": 90000
    },
    "normal": {
      "startTime": "2025-10-10T12:01:30.000Z",
      "endTime": "2025-10-10T12:03:00.000Z",
      "timeMs": 90000
    }
  },
  "counts": {
    "vip": 50000,
    "normal": 950000
  },
  "generationTimeMs": 15000,
  "totalTimeMs": 195000,
  "phase": "completed"
}
```

### 5. Reset System
1. Click **"Reset System"** button
2. Confirm action
3. Database and queues are cleared
4. Ready for next run

---

## Features Demo

### Real-time WebSocket Updates
- Status updates every 500ms
- Live log streaming
- Progress tracking
- Connection health indicator

### Queue Management
Navigate to: **http://localhost:3001/queue**
- View active/waiting/completed jobs
- Pause/resume processing
- Clean failed jobs
- Inspect job details

### Run History
Navigate to: **http://localhost:3001/runs**
- Previous execution records
- Performance metrics
- Timing comparisons

---

## Troubleshooting

### Port Already in Use
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Docker Build Fails
```powershell
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache
docker compose up
```

### Frontend Won't Connect to Backend
Check environment variable in `next-frontend/.env`:
```
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:3000
```

### MongoDB Connection Error
```powershell
# Check MongoDB is running
docker ps | findstr mongo

# View logs
docker logs ecommerce-mongodb
```

---

## Performance Tips

### Faster Order Generation
Reduce batch size in backend config:
```typescript
// nest-backend/src/config/config.schema.ts
MONGODB_BATCH_SIZE: 5000  // Lower = faster initial response
```

### Increase Processing Speed
Add more worker threads:
```typescript
// nest-backend/src/infrastructure/queue/modules/orders-queue.module.ts
concurrency: 10  // Higher = faster processing (CPU-bound)
```

### Monitor Resource Usage
```powershell
# Docker stats
docker stats

# Backend memory
curl http://localhost:3000/pedidos/health/ready
```

---

## Key Endpoints

### Backend API (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pedidos` | GET | Get order processing status |
| `/pedidos/generate` | POST | Start order generation |
| `/pedidos/cancel` | POST | Cancel current run |
| `/pedidos/reset` | POST | Reset system (clear DB + queues) |
| `/pedidos/logs` | GET | Get execution logs |
| `/pedidos/health/live` | GET | Liveness check |
| `/pedidos/health/ready` | GET | Readiness check |

### Frontend Pages (Port 3001)

| Page | Description |
|------|-------------|
| `/` | Main dashboard (status, logs, controls) |
| `/logs` | Detailed log viewer |
| `/queue` | Queue management panel |
| `/runs` | Execution history |

---

## Next Steps

✅ **System is ready to demonstrate Test Case 1**

1. Run Docker Compose
2. Open dashboard
3. Generate 1M orders
4. Monitor VIP-first processing
5. Verify logs and metrics
6. Test reset functionality

**All requirements implemented and working!** 🎉
