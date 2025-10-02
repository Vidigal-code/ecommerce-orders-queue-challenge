# ========================================
# Stage 1: Build Stage
# ========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# ========================================
# Stage 2: Production Stage
# ========================================
FROM node:20-alpine AS production

# Install pnpm and curl for healthcheck
RUN npm install -g pnpm@latest && \
    apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create logs directory
RUN mkdir -p /app/shared/logs && \
    chmod -R 777 /app/shared/logs

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health/ready || exit 1

# Start the application
CMD ["node", "dist/main.js"]
