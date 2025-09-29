# MongoDB & Redis Docker Setup for E-commerce Orders Challenge

This repository provides a ready-to-use Docker setup for MongoDB and Redis, designed for the high-volume e-commerce orders simulation challenge.

---

## Example

<img src="./mongodb-and-redis/example/mongodb-example.png" alt="" width="800"/> 

---

## Features

- **MongoDB 6.0** running in a Docker container
- **Redis 7.2** for BullMQ queue processing
- Pre-configured with a `vidigalcode` user (`test1234` password)
- Automatically creates the `ecommerce` database and the `orders` collection with useful indexes
- Persistent storage via Docker volume
- Accessible both inside Docker containers and externally (host machine)

## How to Use

1. **Clone this repository**
2. **Run Docker Compose:**

   ```bash
   docker-compose up -d
   ```

3. **MongoDB will be available at:**

   ```
   mongodb://vidigalcode:test1234@localhost:27017/ecommerce?authSource=admin
   ```

   You can use this connection string in your backend application *inside or outside a Docker container*.

4. **Redis will be available at:**

   ```
   redis://localhost:6379
   ```

   Use this URL for BullMQ or any queue-processing implementation.

## Initialization Script

The `mongo-init.js` script will:
- Create the `ecommerce` database
- Create the `orders` collection
- Add indexes for faster queries by `id`, `tier`, and `priority`

## Access MongoDB

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

