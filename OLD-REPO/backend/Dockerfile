# AI-FAZI Backend Dockerfile
# Runtime: Node.js 20 LTS on Alpine Linux

FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install dependencies only (leveraging Docker layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Expose backend port
EXPOSE 3000

# Default env (can be overridden via docker-compose or -e)
ENV PORT=3000

# Run the server
CMD ["node", "server.js"]
