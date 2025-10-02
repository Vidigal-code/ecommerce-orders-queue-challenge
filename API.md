# API Documentation

## Base URL
```
http://localhost:3000
```

## Main Endpoints

### GET /pedidos
**Primary endpoint for order status as required by the challenge**

Returns comprehensive information about the order processing system including generation times, processing times, start/end timestamps, and counts for VIP and normal orders.

#### Response Schema
```json
{
  "generationTimeMs": number,           // Time taken to generate orders (ms)
  "enqueueVipTimeMs": number,          // Time taken to enqueue VIP orders (ms)
  "enqueueNormalTimeMs": number,       // Time taken to enqueue NORMAL orders (ms)
  
  "processing": {
    "vip": {
      "start": string | null,          // ISO timestamp when VIP processing started
      "end": string | null,            // ISO timestamp when VIP processing ended
      "timeMs": number,                // Total VIP processing time (ms)
      "count": number                  // Number of VIP orders processed
    },
    "normal": {
      "start": string | null,          // ISO timestamp when NORMAL processing started
      "end": string | null,            // ISO timestamp when NORMAL processing ended
      "timeMs": number,                // Total NORMAL processing time (ms)
      "count": number                  // Number of NORMAL orders processed
    }
  },
  
  "totalTimeMs": number,                // Total execution time (ms)
  
  "counts": {
    "vip": number,                      // Total VIP orders processed
    "normal": number                    // Total NORMAL orders processed
  },
  
  "phase": string,                      // Current phase: IDLE, GENERATING, ENQUEUE_VIP, WAITING_VIP_DRAIN, ENQUEUE_NORMAL, WAITING_NORMAL_DRAIN, DONE, ABORTED, ERROR
  
  "throughput": {
    "vip": number,                      // VIP orders per second
    "normal": number,                   // NORMAL orders per second
    "overall": number                   // Overall orders per second
  },
  
  "eta": {
    "estimatedMs": number | null,       // Estimated time to completion (ms)
    "progressPercent": number           // Progress percentage (0-100)
  },
  
  "progress": {
    "target": number,                   // Target number of orders
    "generated": number,                // Number of orders generated
    "processedTotal": number            // Total orders processed (VIP + NORMAL)
  }
}
```

#### Example Response
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
  "phase": "DONE",
  "throughput": {
    "vip": 81.2,
    "normal": 127.1,
    "overall": 122.9
  },
  "eta": {
    "estimatedMs": null,
    "progressPercent": 100
  },
  "progress": {
    "target": 1000000,
    "generated": 1000000,
    "processedTotal": 1000000
  }
}
```

---

### POST /generate
**Starts order generation and processing**

#### Request Body
```json
{
  "quantity": number,    // Number of orders to generate (e.g., 1000000)
  "force": boolean      // Optional: Force start even if process is running
}
```

#### Response
```json
{
  "message": string,
  "phase": string,
  "forced": boolean,
  "staleRecovered": boolean
}
```

---

### POST /cancel
**Cancels the current running process**

#### Response
```json
{
  "message": string,
  "phase": string
}
```

---

### POST /reset
**Resets the entire system (database and queues)**

#### Response
```json
{
  "message": string,
  "deletedOrders": number,
  "deletedRuns": number,
  "queueCleared": boolean
}
```

---

### GET /pedidos/logs
**Returns detailed execution logs**

#### Query Parameters
- `lines` (optional): Number of log lines to return (default: 500)

#### Response
```json
{
  "processLog": {
    "phase": string,
    "target": number,
    "generated": number,
    "generationTimeMs": number,
    "totalProcessedVIP": number,
    "totalProcessedNormal": number,
    "startVIP": Date,
    "endVIP": Date,
    "startNormal": Date,
    "endNormal": Date,
    "processingTimeVIPMs": number,
    "processingTimeNormalMs": number,
    "totalTimeMs": number,
    "throughput": object,
    "eta": object
  },
  "queueStatus": {
    "waiting": number,
    "active": number,
    "completed": number,
    "failed": number,
    "delayed": number,
    "paused": boolean
  },
  "logs": {
    "logMessages": string[],
    "warnMessages": string[],
    "errorMessages": string[]
  },
  "quickStats": {
    "vipProcessed": number,
    "normalProcessed": number,
    "totalProcessed": number
  }
}
```

---

### GET /health/ready
**Health check endpoint**

#### Response
```json
{
  "status": "ok",
  "timestamp": string,
  "uptime": number,
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

### GET /queue/counts
**Returns queue statistics**

#### Response
```json
{
  "waiting": number,
  "active": number,
  "completed": number,
  "failed": number,
  "delayed": number,
  "paused": boolean
}
```

---

### GET /metrics (Optional)
**Prometheus-compatible metrics endpoint**

Enabled when `ENABLE_METRICS=true` in environment variables.

---

## WebSocket Events

### Connection
```
ws://localhost:3000
```

### Events Emitted by Server

#### `connected`
Sent when client successfully connects
```json
{
  "message": "Connected to order processing server",
  "timestamp": number,
  "clientId": string
}
```

#### `log`
Real-time log messages
```json
{
  "timestamp": number,
  "level": "log" | "warn" | "error",
  "message": string,
  "category": string,
  "data": any
}
```

#### `progress`
Real-time progress updates during generation and processing
```json
{
  "phase": string,
  "progress": number,              // 0-100
  "total": number,
  "current": number,
  "message": string,
  "vipProcessed": number,
  "normalProcessed": number,
  "generationTime": number,
  "vipProcessingTime": number,
  "normalProcessingTime": number,
  "timestamp": number
}
```

#### `status`
System status updates
```json
{
  "phase": string,
  "timestamp": number,
  "message": string
}
```

#### `metrics`
Performance metrics
```json
{
  "timestamp": number,
  // ... various metrics
}
```

### Events Client Can Send

#### `get-status`
Request current system status

#### `start-generation`
```json
{
  "quantity": number
}
```

#### `cancel-operation`
Request cancellation of current operation

#### `reset-system`
Request system reset

---

## Challenge Compliance Matrix

| Requirement | Endpoint/Feature | Status |
|------------|------------------|--------|
| Generate 1M orders | POST /generate | ✅ |
| Store in MongoDB | Automatic | ✅ |
| Priority field (VIP/NORMAL) | Order entity | ✅ |
| BullMQ queue processing | Background workers | ✅ |
| Process VIP first | Two-phase processing | ✅ |
| Update observations field | Worker processor | ✅ |
| Track generation time | GET /pedidos | ✅ |
| Track processing times by priority | GET /pedidos.processing | ✅ |
| Track start/end times | GET /pedidos.processing.*.start/end | ✅ |
| Total execution time | GET /pedidos.totalTimeMs | ✅ |
| Order counts by type | GET /pedidos.counts | ✅ |
| Detailed logs | GET /pedidos/logs | ✅ |
| Single GET endpoint | GET /pedidos | ✅ |
| Reset functionality | POST /reset | ✅ |
| Real-time updates | WebSocket | ✅ |
| Scalability | Docker + BullMQ | ✅ |

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "statusCode": number,
  "message": string,
  "error": string
}
```

Common status codes:
- `400` - Bad Request
- `409` - Conflict (e.g., process already running)
- `500` - Internal Server Error
