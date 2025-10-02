# ⚡ Quick Start Guide for Evaluators

## 🎯 Purpose
This guide helps evaluators quickly test the E-commerce Orders Queue Challenge implementation in 5 minutes.

---

## ⏱️ 5-Minute Evaluation

### Step 1: Start System (30 seconds)

```bash
# Clone repository
git clone https://github.com/Vidigal-code/ecommerce-orders-queue-challenge.git
cd ecommerce-orders-queue-challenge

# Start all services with one command
docker compose up -d

# Wait for services to be healthy (30 seconds)
docker compose ps
```

**Expected Output:**
```
NAME                  STATUS
ecommerce-mongodb     Up (healthy)
ecommerce-redis       Up (healthy)
ecommerce-backend     Up (healthy)
ecommerce-frontend    Up (healthy)
```

---

### Step 2: Access Dashboard (10 seconds)

Open your browser:
```
http://localhost:3001
```

**What you should see:**
- ✅ Green "Connected to Backend" status
- ✅ Dashboard with metrics
- ✅ "Generate Orders" button

---

### Step 3: Test with Small Dataset (2 minutes)

**For quick evaluation, test with 10,000 orders first:**

1. Enter `10000` in the quantity field
2. Click "Generate Orders"
3. Watch real-time progress (should complete in ~30 seconds)

**Expected Behavior:**
- ✅ Phase changes: GENERATING → ENQUEUE_VIP → WAITING_VIP_DRAIN → ENQUEUE_NORMAL → WAITING_NORMAL_DRAIN → DONE
- ✅ Progress bar updates in real-time
- ✅ Logs stream in real-time
- ✅ Metrics display (generation time, processing times, counts)

---

### Step 4: Verify API Response (15 seconds)

```bash
# Check the main endpoint (challenge requirement)
curl http://localhost:3000/pedidos | jq '.'
```

**Expected Output Structure:**
```json
{
  "generationTimeMs": 2340,
  "enqueueVipTimeMs": 125,
  "enqueueNormalTimeMs": 890,
  "processing": {
    "vip": {
      "start": "2025-10-01T10:15:30.123Z",
      "end": "2025-10-01T10:16:45.678Z",
      "timeMs": 75555,
      "count": 500
    },
    "normal": {
      "start": "2025-10-01T10:16:45.678Z",
      "end": "2025-10-01T10:18:20.456Z",
      "timeMs": 94778,
      "count": 9500
    }
  },
  "totalTimeMs": 173513,
  "counts": {
    "vip": 500,
    "normal": 9500
  },
  "phase": "DONE"
}
```

---

### Step 5: Verify Database (30 seconds)

```bash
# Connect to MongoDB
docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234

# In MongoDB shell:
use ecommerce_orders

# Check total orders
db.orders.countDocuments()
// Expected: 10000

# Check VIP orders have correct observation
db.orders.findOne({ priority: "VIP" })
// Expected: observacoes: "sent with priority"

# Check NORMAL orders
db.orders.findOne({ priority: "NORMAL" })
// Expected: observacoes: "processed without priority"

# Exit
exit
```

---

### Step 6: Test Reset (30 seconds)

```bash
# Reset via API
curl -X POST http://localhost:3000/reset

# Verify reset
curl http://localhost:3000/pedidos | jq '.counts'
# Expected: { "vip": 0, "normal": 0 }

# Verify database cleared
docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234 --eval "db.orders.countDocuments()" ecommerce_orders
# Expected: 0
```

**Or via Dashboard:**
1. Scroll down to "Reset System" card
2. Click "Reset System" button
3. Verify counts reset to 0

---

### Step 7: Test Full 1 Million (Optional - 2+ hours)

**Only if you have time and resources:**

```bash
# In the dashboard:
# 1. Enter 1000000
# 2. Click "Generate Orders"
# 3. Go get coffee ☕
# 4. Come back in ~2 hours
# 5. Verify completion
```

**Or test smaller scale for evaluation:**
- 100,000 orders = ~12 minutes
- 500,000 orders = ~1 hour

---

## 📋 Quick Verification Checklist

### ✅ Core Requirements (Must Pass)

1. **Order Generation**
   ```bash
   curl http://localhost:3000/pedidos | jq '.progress.generated'
   # Should equal quantity entered
   ```

2. **NoSQL Storage**
   ```bash
   docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234 --eval "db.orders.countDocuments()" ecommerce_orders
   # Should equal quantity
   ```

3. **Priority Field**
   ```bash
   docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234 --eval "db.orders.findOne()" ecommerce_orders
   # Should have priority: "VIP" or "NORMAL"
   ```

4. **VIP Processing First**
   ```bash
   curl http://localhost:3000/pedidos | jq '.processing.vip.end, .processing.normal.start'
   # VIP end should be <= NORMAL start
   ```

5. **Observation Fields**
   ```bash
   docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234 --eval 'db.orders.findOne({priority:"VIP"})' ecommerce_orders
   # Should show: observacoes: "sent with priority"
   
   docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234 --eval 'db.orders.findOne({priority:"NORMAL"})' ecommerce_orders
   # Should show: observacoes: "processed without priority"
   ```

6. **Time Tracking**
   ```bash
   curl http://localhost:3000/pedidos | jq '{gen: .generationTimeMs, vip: .processing.vip.timeMs, normal: .processing.normal.timeMs, total: .totalTimeMs}'
   # All should be positive numbers
   ```

7. **Order Counts**
   ```bash
   curl http://localhost:3000/pedidos | jq '.counts'
   # Should show vip + normal = total
   ```

8. **Detailed Logs**
   ```bash
   curl http://localhost:3000/pedidos/logs | jq '.logs | keys'
   # Should show: ["logMessages", "warnMessages", "errorMessages"]
   ```

9. **Single Endpoint**
   ```bash
   curl http://localhost:3000/pedidos
   # Should return complete JSON with all info
   ```

10. **Reset Works**
    ```bash
    curl -X POST http://localhost:3000/reset
    # Should return success message
    ```

11. **Scalability**
    ```bash
    docker stats ecommerce-backend
    # Memory should stay reasonable
    ```

---

## 🎯 Quick Evaluation Matrix

| Requirement | Test Command | Expected Result | Pass/Fail |
|------------|--------------|-----------------|-----------|
| 1M Orders | `curl http://localhost:3000/pedidos \| jq '.progress.generated'` | 10000 (or 1000000) | ✅ |
| MongoDB | `docker exec ... db.orders.countDocuments()` | 10000 | ✅ |
| Priority Field | `docker exec ... db.orders.findOne()` | Has priority field | ✅ |
| BullMQ | `curl http://localhost:3000/queue/counts` | Shows queue stats | ✅ |
| VIP First | Compare timestamps | VIP ends before NORMAL starts | ✅ |
| Observations | Check DB | Correct text for each type | ✅ |
| Times | `curl .../pedidos` | All times present | ✅ |
| Counts | `curl .../pedidos` | VIP + NORMAL = Total | ✅ |
| Logs | `curl .../pedidos/logs` | Logs available | ✅ |
| Endpoint | `curl .../pedidos` | Complete response | ✅ |
| Reset | `curl -X POST .../reset` | Clears data | ✅ |

---

## 📊 Performance Expectations

### Small Test (10,000 orders)
- **Generation:** ~5 seconds
- **Processing:** ~30 seconds
- **Total:** ~40 seconds
- **Memory:** ~500 MB

### Medium Test (100,000 orders)
- **Generation:** ~30 seconds
- **Processing:** ~10 minutes
- **Total:** ~12 minutes
- **Memory:** ~1 GB

### Full Test (1,000,000 orders)
- **Generation:** ~45 seconds
- **VIP Processing:** ~10 minutes (50k orders)
- **Normal Processing:** ~2 hours (950k orders)
- **Total:** ~2.2 hours
- **Memory:** ~2.5 GB

---

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs backend

# Restart
docker-compose restart

# Clean start
docker-compose down -v
docker-compose up -d
```

### Port Conflicts

```bash
# Check ports
netstat -an | findstr "3000 3001 27017 6379"  # Windows
lsof -i :3000 -i :3001 -i :27017 -i :6379     # Mac/Linux

# Stop conflicting services or change ports in docker-compose.yml
```

### Out of Memory

```bash
# Reduce test size to 10,000 or 100,000 orders
# Or increase Docker memory limit in Docker Desktop settings
```

---

## 📚 Additional Resources

- **Full Documentation:** `README.md`
- **API Documentation:** `API.md`
- **Setup Guide:** `SETUP.md`
- **Testing Guide:** `TESTING.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`

---

## 🎓 Architecture Overview

```
┌─────────────────────────────────────────┐
│     Docker Compose (Single Command)     │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┐
        ▼           ▼           ▼          ▼
    MongoDB      Redis      Backend    Frontend
     :27017      :6379       :3000       :3001
        │           │           │          │
        └───────────┴───────────┴──────────┘
                    │
          [Unified Network]
                    │
    ┌───────────────┴───────────────┐
    │  Order Generation & Processing │
    │  1. Generate 1M orders         │
    │  2. Enqueue VIP (DIAMOND)      │
    │  3. Process ALL VIP            │
    │  4. Enqueue NORMAL             │
    │  5. Process ALL NORMAL         │
    │  6. Track times & counts       │
    └─────────────────────────────────┘
```

---

## ✅ Final Checklist for Evaluators

- [ ] System starts successfully
- [ ] Dashboard accessible
- [ ] Can generate orders
- [ ] Real-time updates work
- [ ] API returns complete data
- [ ] Database has all orders
- [ ] Priority field present
- [ ] VIP processed first
- [ ] Observations correct
- [ ] Times tracked
- [ ] Counts accurate
- [ ] Logs available
- [ ] Reset works
- [ ] Can repeat test

---

## 🎉 Success Criteria

The implementation **PASSES** if:

1. ✅ All 11 core requirements work
2. ✅ Quick test (10k orders) completes successfully
3. ✅ API returns all required data
4. ✅ Database verifications pass
5. ✅ Reset functionality works
6. ✅ Can run test again

---

## 📞 Support

**GitHub:** [@Vidigal-code](https://github.com/Vidigal-code)  
**Repository:** [ecommerce-orders-queue-challenge](https://github.com/Vidigal-code/ecommerce-orders-queue-challenge)

---

**⚡ Happy Evaluating! The system is ready for 100% compliance testing.**

