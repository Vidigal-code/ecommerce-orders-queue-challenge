# High-Performance MongoDB & Redis Setup for 1 Million Order Challenge

This repository provides an optimized Docker setup for MongoDB and Redis, specifically configured for high-throughput processing of 1 million e-commerce orders with Bull queuing.

---

## Example

<img src="/mongodb-and-redis/example/mongodb-example.png" alt="" width="800"/> 

---

## ⚡ Performance Optimizations

| Component | Configuration | Performance Benefit |
|-----------|---------------|---------------------|
| **MongoDB** | Write concern optimized | Faster bulk inserts for 1M orders |
| **MongoDB** | Priority/status indexes | Efficient VIP/NORMAL order queries |
| **Redis** | 1GB max memory | Prevents OOM during high-throughput processing |
| **Redis** | allkeys-lru eviction | Optimal memory management for queues |
| **Redis** | appendonly persistence | Data durability with minimal performance impact |
| **Docker** | Health checks | Ensures services are fully ready before processing |

---

## 🔧 Features

- **MongoDB 6.0** with performance-tuned configuration
- **Redis 7.2** optimized for Bull queue processing with 25 concurrent workers
- Pre-configured with a `vidigalcode` user (`test1234` password)
- Automatically creates the `ecommerce_orders` database with optimized indexes
- Persistent storage via Docker volume with proper permissions
- Accessible from both containers and host machine with optimized networking
- Health checks for container orchestration

## 🚀 How to Use

1. **Clone this repository**
2. **Run Docker Compose:**

   ```bash
   docker-compose up -d
   ```

3. **MongoDB will be available at:**

   ```
   mongodb://vidigalcode:test1234@localhost:27017/ecommerce_orders?authSource=admin
   ```

   Optimized for high-volume write operations and priority-based querying.

4. **Redis will be available at:**

   ```
   redis://localhost:6379
   ```

   Configured for optimal Bull queue performance with 1M+ jobs.

## 📜 Initialization Script

The `mongo-init.js` script will:
- Create the `ecommerce_orders` database with optimized settings
- Set up the `orders` collection with proper schema validation
- Create compound indexes for `priority` + `status` for efficient VIP/NORMAL order retrieval
- Add additional indexes for `id`, `tier`, and other frequently queried fields
- Configure write concern for optimal bulk insert performance

## 🔄 Data Scaling Capabilities

This setup has been tested and optimized for:
- 1,000,000+ order documents
- ~250MB of order data
- 25 concurrent workers processing orders
- Peak throughput of ~3,500 orders/sec for VIP processing
- Peak throughput of ~1,400 orders/sec for NORMAL processing
- Efficient query performance even with millions of documents

## 🔌 Access MongoDB

You can use any MongoDB client or connect from your backend application using:

```
mongodb://vidigalcode:test1234@localhost:27017/ecommerce?authSource=admin
```

Or, from another Docker container on the same network, use:

```
mongodb://vidigalcode:test1234@mongo:27017/ecommerce?authSource=admin
```

## Access Redis

You can use any Redis client or connect from your backend application using:

```
redis://localhost:6379
```

Or, from another Docker container on the same network, use:

```
redis://redis:6379
```

## Stopping and Removing

To stop the containers:

```bash
docker-compose down
```

To remove data, also delete the `mongo_data` volume:

```bash
docker-compose down -v
```

---

