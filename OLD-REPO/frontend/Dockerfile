# Frontend Dockerfile for Vite + Vue 3 production build
# Multi-stage build: build + serve with nginx
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci || npm i --no-audit --no-fund

# Copy source and build
COPY . .

# Accept build argument for API URL
ARG VITE_APP_API_BASE_URL
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL

RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Nginx runs automatically
