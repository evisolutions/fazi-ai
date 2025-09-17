# Frontend Dockerfile for Vite + Vue 3 dev server
# Development-oriented image; serves on port 5173
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci || npm i --no-audit --no-fund

# Copy source
COPY . .

EXPOSE 5173

# Run Vite dev server binding to 0.0.0.0 so it’s reachable from host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
