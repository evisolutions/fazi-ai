# FAZI-AI Project

This project contains both staging and production deployment configurations.

## Deploy Scripts

### Local Development
- **Backend URL**: `http://localhost:3000`
- **Environment file**: `env.local`
- **Use case**: Local development

### Staging Deployment
```bash
./deploy-staging.sh
```
- **Backend URL**: `https://fazi.api.evi.rs`
- **Image tags**: `staging`
- **Use case**: Staging deployment

### Production Deployment
```bash
./deploy-production.sh
```
- **Backend URL**: `https://fazi.api.evi.rs`
- **Image tags**: `latest`
- **Use case**: Production deployment (not ready yet)

## Server Files

The `server-files/` folder contains everything needed for production deployment:

- `server-deploy.sh` - Deploy script for server
- `docker-compose.yml` - Docker Compose configuration
- `env.example` - Environment variables template
- `nginx-frontend.conf` - Nginx config for fazi.evi.rs
- `nginx-backend.conf` - Nginx config for fazi.api.evi.rs

## Quick Start

1. **For staging**: `./deploy-staging.sh`
2. **For production**: `./deploy-production.sh`
3. **For server deployment**: Copy `server-files/` to server and run `./server-deploy.sh`

## Environment Variables

### Frontend
- **Local**: `VITE_API_BASE_URL=http://localhost:3000` (env.local)
- **Staging**: `VITE_API_BASE_URL=https://fazi.api.evi.rs` (env.staging)
- **Production**: `VITE_API_BASE_URL=https://fazi.api.evi.rs` (env.production)

### Backend
- **Local**: Uses local environment
- **Staging**: Uses staging environment variables
- **Production**: Uses production environment variables from `.env`
