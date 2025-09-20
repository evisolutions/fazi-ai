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

# Pull staging images
echo "Pulling staging images..."
docker pull evisolutions/fazi-ai-backend:staging
docker pull evisolutions/fazi-ai-python:staging
docker pull evisolutions/fazi-ai-frontend:staging

# Start containers
echo "Starting containers..."
docker compose up --remove-orphans -d

echo "=========================================="
echo "Deployment completed!"
echo "Backend: http://localhost:7847"
echo "Python API: Internal only (Docker network)"
echo "Frontend: http://localhost:9234"
echo "=========================================="
