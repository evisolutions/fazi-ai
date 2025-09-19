# FAZI-AI Server Deployment Files

This folder contains all the files needed to deploy FAZI-AI on a server.

## Files

- `server-deploy.sh` - Main deployment script
- `docker-compose.yml` - Docker Compose configuration
- `env.example` - Environment variables template
- `nginx-frontend.conf` - Nginx config for fazi.evi.rs (frontend)
- `nginx-backend.conf` - Nginx config for fazi.api.evi.rs (backend)
- `README.md` - This file

## Quick Start

1. **Copy all files to your server**
2. **Create environment file**:
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```
3. **Run deployment**:
   ```bash
   ./server-deploy.sh
   ```

## Environment Variables

**Frontend**: No environment file needed - API URL is built into the image.

**Backend**: Edit `.env` file with your actual values:

- `OPENAI_API_KEY` - Your OpenAI API key (required for AI functionality)

## Access

After deployment:
- **Frontend**: https://fazi.evi.rs (via nginx)
- **Backend**: https://fazi.api.evi.rs (separate subdomain)
- **Direct access**: 
  - Frontend: http://your-server:9234
  - Backend: http://your-server:7847

## Nginx Setup

1. **Copy nginx configs**:
   ```bash
   # Frontend
   sudo cp nginx-frontend.conf /etc/nginx/sites-available/fazi.evi.rs
   sudo ln -s /etc/nginx/sites-available/fazi.evi.rs /etc/nginx/sites-enabled/
   
   # Backend
   sudo cp nginx-backend.conf /etc/nginx/sites-available/fazi.api.evi.rs
   sudo ln -s /etc/nginx/sites-available/fazi.api.evi.rs /etc/nginx/sites-enabled/
   
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **SSL Certificates** (if not already set up):
   ```bash
   sudo certbot --nginx -d fazi.evi.rs
   sudo certbot --nginx -d fazi.api.evi.rs
   ```

## Commands

- **Deploy**: `./server-deploy.sh`
- **Stop**: `docker compose down`
- **Logs**: `docker compose logs -f`
- **Status**: `docker compose ps`
