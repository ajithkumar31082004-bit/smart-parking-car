# Multi-stage Dockerfile for SmartPark AI
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Final Stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/database/smartpark.db

COPY --from=builder /app /app

EXPOSE 5000

# Seed database if not exists and start server
CMD ["node", "backend/src/server.js"]
