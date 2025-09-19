#!/bin/bash

# FAZI-AI Server Deploy Script
# This script pulls and runs the latest images on the server

set -e

echo "=========================================="
echo "FAZI-AI Server Deploy Script"
echo "=========================================="

# Clean up old images
echo "Cleaning up old images..."
docker image prune -a -f
docker image prune --filter "dangling=true" -f

# Pull latest images
echo "Pulling latest images..."
docker pull evisolutions/fazi-ai-backend:latest
docker pull evisolutions/fazi-ai-frontend:latest

# Start containers
echo "Starting containers..."
docker compose up --remove-orphans -d

echo "=========================================="
echo "Deployment completed!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo "=========================================="
