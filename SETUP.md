# 🚀 Complete Setup Guide

This guide will walk you through setting up the E-commerce Orders Queue Challenge system from scratch.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Methods](#installation-methods)
3. [Docker Setup (Recommended)](#docker-setup-recommended)
4. [Local Development Setup](#local-development-setup)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **RAM**: 8 GB
- **Disk Space**: 10 GB free
- **CPU**: 4 cores

### Recommended Requirements
- **RAM**: 16 GB or more
- **Disk Space**: 20 GB free (SSD recommended)
- **CPU**: 8 cores or more
- **Network**: Stable internet connection for Docker pulls

### Software Dependencies

#### For Docker Setup (Recommended)
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

#### For Local Development
- [Node.js](https://nodejs.org/) 20.x or higher
- [pnpm](https://pnpm.io/) 8.x or higher
- [MongoDB](https://www.mongodb.com/try/download/community) 6.0+
- [Redis](https://redis.io/download) 7.2+
- [Git](https://git-scm.com/downloads)

---

## Installation Methods

### Method 1: Docker (Recommended) 🐳

**Pros:**
- ✅ Single command setup
- ✅ Isolated environment
- ✅ Consistent across all platforms
- ✅ No manual dependency installation
- ✅ Production-ready

**Cons:**
- ❌ Requires Docker installation
- ❌ Higher resource usage

### Method 2: Local Development

**Pros:**
- ✅ Faster development iteration
- ✅ Full control over services
- ✅ Better debugging capabilities
- ✅ Lower resource usage

**Cons:**
- ❌ Manual dependency installation
- ❌ Platform-specific setup
- ❌ Potential version conflicts

---

## Docker Setup (Recommended)

### Step 1: Install Docker

**Windows:**
1. Download [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
2. Run the installer
3. Enable WSL 2 if prompted
4. Restart your computer

**macOS:**
1. Download [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
2. Run the installer
3. Start Docker Desktop

**Linux (Ubuntu/Debian):**
```bash
# Update package index
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Reboot
sudo reboot
```

### Step 2: Verify Docker Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10+ or higher

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version 2.0+ or higher

# Test Docker
docker run hello-world
# Should download and run successfully
```

### Step 3: Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/Vidigal-code/ecommerce-orders-queue-challenge.git

# OR via SSH
git clone git@github.com:Vidigal-code/ecommerce-orders-queue-challenge.git

# Navigate to project directory
cd ecommerce-orders-queue-challenge
```

### Step 4: Configure Environment Variables (Optional)

The system works with default values, but you can customize:

```bash
# Backend configuration (optional)
cd nest-backend
cp .env.example .env
# Edit .env to customize settings
cd ..

# Frontend configuration (optional)
cd next-frontend
cp .env.example .env
# Edit .env if needed
cd ..
```

### Step 5: Start All Services

```bash
# Build and start all services
docker-compose up -d

# This will:
# 1. Pull required Docker images (MongoDB, Redis, Node)
# 2. Build backend Docker image
# 3. Build frontend Docker image
# 4. Start all services in detached mode

# Expected output:
# Creating network "ecommerce-orders-network" ... done
# Creating volume "ecommerce-mongodb-data" ... done
# Creating volume "ecommerce-redis-data" ... done
# Creating ecommerce-mongodb ... done
# Creating ecommerce-redis   ... done
# Creating ecommerce-backend ... done
# Creating ecommerce-frontend ... done
```

### Step 6: Monitor Startup

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Check service status
docker-compose ps

# Expected output:
# NAME                  STATUS              PORTS
# ecommerce-mongodb     Up (healthy)        0.0.0.0:27017->27017/tcp
# ecommerce-redis       Up (healthy)        0.0.0.0:6379->6379/tcp
# ecommerce-backend     Up (healthy)        0.0.0.0:3000->3000/tcp
# ecommerce-frontend    Up (healthy)        0.0.0.0:3001->3001/tcp
```

### Step 7: Access the Application

Wait for all services to be healthy (1-2 minutes), then:

- **Frontend Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Status**: http://localhost:3000/pedidos
- **Health Check**: http://localhost:3000/health/ready

### Step 8: Test the System

1. Open http://localhost:3001 in your browser
2. You should see the dashboard with "Connected to Backend" status
3. Click "Generate Orders" to start processing
4. Watch real-time progress updates

### Docker Management Commands

```bash
# Stop all services
docker-compose stop

# Start stopped services
docker-compose start

# Restart all services
docker-compose restart

# Stop and remove all containers
docker-compose down

# Stop and remove all containers + volumes (complete cleanup)
docker-compose down -v

# View resource usage
docker stats

# Access container shell
docker exec -it ecommerce-backend sh
docker exec -it ecommerce-mongodb mongosh -u vidigalcode -p test1234

# Rebuild images after code changes
docker-compose up -d --build
```

---

## Local Development Setup

### Step 1: Install Dependencies

#### Install Node.js and pnpm

**Windows:**
```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Install pnpm globally
npm install -g pnpm
```

**macOS:**
```bash
# Using Homebrew
brew install node@20
brew install pnpm
```

**Linux (Ubuntu/Debian):**
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm
```

#### Install MongoDB

**Windows:**
1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Run the installer
3. MongoDB will start automatically as a service

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Install Redis

**Windows:**
```powershell
# Redis is not officially supported on Windows
# Use Docker or WSL2:
wsl --install
wsl
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Step 2: Verify Services

```bash
# Test MongoDB
mongosh --eval "db.version()"
# Expected: 6.0.x

# Test Redis
redis-cli ping
# Expected: PONG

# Test Node.js
node --version
# Expected: v20.x.x

# Test pnpm
pnpm --version
# Expected: 8.x.x
```

### Step 3: Setup MongoDB Database

```bash
# Connect to MongoDB
mongosh

# Create database and user
use admin
db.createUser({
  user: "vidigalcode",
  pwd: "test1234",
  roles: [{ role: "readWrite", db: "ecommerce_orders" }]
})

# Switch to application database
use ecommerce_orders

# Verify
db.runCommand({ connectionStatus: 1 })

# Exit
exit
```

### Step 4: Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/Vidigal-code/ecommerce-orders-queue-challenge.git
cd ecommerce-orders-queue-challenge

# Setup backend
cd nest-backend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Edit .env file:
# MONGO_URI=mongodb://vidigalcode:test1234@localhost:27017/ecommerce_orders?authSource=admin
# REDIS_HOST=localhost
# REDIS_PORT=6379
# PORT=3000

# Build the project
pnpm run build

# Start in development mode
pnpm run start:dev

# Backend should start on http://localhost:3000
```

### Step 5: Setup Frontend

Open a new terminal:

```bash
cd ecommerce-orders-queue-challenge/next-frontend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Edit .env file:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
# NEXT_PUBLIC_WS_URL=http://localhost:3000
# PORT=3001

# Start in development mode
pnpm run dev

# Frontend should start on http://localhost:3001
```

### Step 6: Verify Setup

1. Backend health check:
   ```bash
   curl http://localhost:3000/health/ready
   ```

2. Open frontend:
   ```
   http://localhost:3001
   ```

3. Check WebSocket connection (should show "Connected to Backend")

---

## Configuration

### Backend Configuration Options

Edit `nest-backend/.env`:

```bash
# === Performance Tuning ===
MAX_ORDERS=1000000              # Total orders to generate
GENERATION_CHUNK_SIZE=25000     # Orders per generation batch
ORDERS_QUEUE_CONCURRENCY=10     # Number of concurrent workers
BULK_UPDATE_MODE=true           # Use bulk updates

# === Database ===
MONGO_URI=mongodb://vidigalcode:test1234@localhost:27017/ecommerce_orders?authSource=admin

# === Queue ===
REDIS_HOST=localhost
REDIS_PORT=6379

# === Server ===
PORT=3000
CORS_ORIGIN=http://localhost:3001

# === Optional ===
ENABLE_METRICS=false            # Enable Prometheus metrics
LOG_LEVEL=log                   # log, warn, error, debug
```

### Frontend Configuration Options

Edit `next-frontend/.env`:

```bash
# === API Connection ===
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000

# === Server ===
PORT=3001

# === Optional ===
NEXT_TELEMETRY_DISABLED=1
```

---

## Verification

### Quick Verification Checklist

- [ ] Docker/Services are running
- [ ] MongoDB is accessible
- [ ] Redis is accessible
- [ ] Backend responds to health check
- [ ] Frontend loads in browser
- [ ] WebSocket connection is established
- [ ] Can generate orders
- [ ] Can view progress in real-time
- [ ] Can query `/pedidos` endpoint
- [ ] Can reset system

### Detailed Verification

#### 1. Check Services

```bash
# Docker setup
docker-compose ps

# Local setup
# MongoDB
mongosh -u vidigalcode -p test1234 --authenticationDatabase admin

# Redis
redis-cli ping

# Backend
curl http://localhost:3000/health/ready

# Frontend
curl http://localhost:3001
```

#### 2. Test Order Generation

```bash
# Start generation
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10000}'

# Check status
curl http://localhost:3000/pedidos

# Check queue
curl http://localhost:3000/queue/counts
```

#### 3. Verify Database

```bash
# Connect to MongoDB
mongosh -u vidigalcode -p test1234 --authenticationDatabase admin

# Check orders
use ecommerce_orders
db.orders.countDocuments()
db.orders.findOne()

# Check by priority
db.orders.countDocuments({ priority: "VIP" })
db.orders.countDocuments({ priority: "NORMAL" })
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Port Already in Use

**Error:** `Port 3000 (or 3001, 27017, 6379) is already in use`

**Solution:**
```bash
# Find process using port (Linux/Mac)
lsof -i :3000

# Find process using port (Windows)
netstat -ano | findstr :3000

# Kill process or change port in .env file
```

#### Issue: Docker Container Fails to Start

**Error:** `Container exits immediately`

**Solution:**
```bash
# Check logs
docker-compose logs backend

# Remove volumes and restart
docker-compose down -v
docker-compose up -d --build
```

#### Issue: MongoDB Connection Refused

**Error:** `MongoServerError: Authentication failed`

**Solution:**
```bash
# Verify MongoDB is running
docker ps | grep mongodb
# OR
mongosh --eval "db.version()"

# Reset MongoDB authentication
docker exec -it ecommerce-mongodb mongosh admin
db.dropUser("vidigalcode")
db.createUser({
  user: "vidigalcode",
  pwd: "test1234",
  roles: [{ role: "root", db: "admin" }]
})
```

#### Issue: Redis Connection Failed

**Error:** `Error: ECONNREFUSED localhost:6379`

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Restart Redis
# Docker:
docker-compose restart redis

# Local:
sudo systemctl restart redis-server  # Linux
brew services restart redis          # Mac
```

#### Issue: WebSocket Not Connecting

**Error:** Frontend shows "Disconnected from Backend"

**Solution:**
1. Check backend is running: `curl http://localhost:3000/health/ready`
2. Verify CORS settings in backend `.env`
3. Check browser console for errors
4. Ensure firewall isn't blocking ports

#### Issue: Out of Memory During Processing

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Reduce configuration in backend .env:
MAX_ORDERS=100000                 # Instead of 1M
GENERATION_CHUNK_SIZE=10000       # Smaller chunks
ORDERS_QUEUE_CONCURRENCY=5        # Fewer workers

# OR increase Node.js memory:
NODE_OPTIONS="--max-old-space-size=4096" pnpm run start:dev
```

#### Issue: Slow Processing

**Symptoms:** Processing takes very long

**Solution:**
1. Check system resources: `docker stats` or `top`
2. Increase concurrency: `ORDERS_QUEUE_CONCURRENCY=20`
3. Use SSD for better I/O
4. Increase MongoDB cache size
5. Enable bulk updates: `BULK_UPDATE_MODE=true`

---

## Next Steps

After successful setup:

1. Read [API.md](./API.md) for API documentation
2. Check [README.md](./README.md) for usage examples
3. Try generating 1 million orders
4. Explore the dashboard features
5. Monitor real-time progress
6. Test reset functionality

---

## Support

If you encounter issues not covered here:

1. Check existing [GitHub Issues](https://github.com/Vidigal-code/ecommerce-orders-queue-challenge/issues)
2. Review logs: `docker-compose logs` or application logs
3. Verify all prerequisites are met
4. Create a new issue with:
   - OS and version
   - Docker/Node.js versions
   - Error messages
   - Steps to reproduce

---

**Happy Coding! 🚀**

