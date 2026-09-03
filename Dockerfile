# Multi-stage Dockerfile for SmartPark AI

# ================================
# Stage 1 — Build
# ================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .


# ================================
# Stage 2 — Production
# ================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/database/smartpark.db

COPY --from=builder /app /app

EXPOSE 5000

# Clear the inherited Node.js entrypoint
ENTRYPOINT []

# Start SmartPark AI
CMD ["node", "backend/src/server.js"]
