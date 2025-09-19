#!/bin/bash

# FAZI-AI Production Deploy Script
# Build and push images for production

set -e

echo "=========================================="
echo "FAZI-AI Production Deploy Script"
echo "=========================================="

# Check Docker
if (! docker stats --no-stream > /dev/null 2>&1); then
  echo "Docker is not running. Please start Docker."
  exit 1
fi

# Ensure node and pnpm are available
export PATH="/c/Program Files/nodejs:/c/ProgramData/ComposerSetup/bin:$PATH"

# Frontend will be built inside Docker container
# No need for local build since Dockerfile handles it

# Build backend
if [ -d "OLD-REPO/backend" ]; then
  echo "Building backend for production..."
  cd OLD-REPO/backend
  npm install || { echo "npm install failed"; exit 1; }
  cd ../..
fi

# Stop existing containers
echo "Stopping containers..."
if [ -f "OLD-REPO/backend/docker-compose.yml" ]; then
  cd OLD-REPO/backend
  docker-compose down || echo "No containers to stop"
  cd ../..
fi

# Build Docker images
echo "Building Docker images..."
if [ -f "OLD-REPO/backend/docker-compose.yml" ]; then
  cd OLD-REPO/backend
  docker-compose build --no-cache || { echo "Docker build failed"; exit 1; }
  docker-compose up -d || { echo "Docker Compose up failed"; exit 1; }
  cd ../..
fi

# Tag and push images
echo "Tagging images..."

# Docker Hub username
DOCKERHUB_USERNAME="evisolutions"

# Tag backend image
BACKEND_IMAGE="${DOCKERHUB_USERNAME}/fazi-ai-backend:latest"
docker tag fazi-ai-old-repo-backend ${BACKEND_IMAGE}
echo "Tagged: ${BACKEND_IMAGE}"

# Tag frontend image
FRONTEND_IMAGE="${DOCKERHUB_USERNAME}/fazi-ai-frontend:latest"
docker tag fazi-ai-old-repo-frontend ${FRONTEND_IMAGE}
echo "Tagged: ${FRONTEND_IMAGE}"

# Push images to Docker registry
echo "Pushing images to Docker registry..."
docker push ${BACKEND_IMAGE} || { echo "Backend push failed"; exit 1; }
docker push ${FRONTEND_IMAGE} || { echo "Frontend push failed"; exit 1; }

echo "=========================================="
echo "Done! Production images built, tagged and pushed."
echo "Backend: ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"
echo "=========================================="
