#!/bin/bash

# Minimal SSL Domain Setup Script
# Usage: ./setup-ssl-domain-minimal.sh <domain> [email]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <domain> [email]"
    exit 1
fi

domain=$1
email=${2:-"admin@$domain"}
webroot_path="/var/www/$domain"
config_file="/etc/nginx/sites-available/$domain"
sites_enabled="/etc/nginx/sites-enabled/$domain"

print_status "Setting up SSL and nginx for domain: $domain"

# Create directories
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/log/nginx
mkdir -p "$webroot_path"

# Create webroot index.html
cat > "$webroot_path/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to $domain</title>
</head>
<body>
    <h1>Welcome to $domain</h1>
    <p>Site is ready!</p>
</body>
</html>
EOF

# Set permissions
chown -R www-data:www-data "$webroot_path" 2>/dev/null || chown -R nginx:nginx "$webroot_path" 2>/dev/null || true
chmod -R 755 "$webroot_path"

# Generate SSL certificate
print_status "Generating SSL certificate for $domain"

# Try webroot method first, fallback to standalone
if certbot certonly --webroot -w "$webroot_path" -d "$domain" --email "$email" --agree-tos --non-interactive; then
    print_success "SSL certificate generated successfully (webroot method)"
else
    print_status "Webroot failed, trying standalone method..."
    systemctl stop nginx
    if certbot certonly --standalone -d "$domain" --email "$email" --agree-tos --non-interactive; then
        print_success "SSL certificate generated successfully (standalone method)"
    else
        print_error "Failed to generate SSL certificate"
        systemctl start nginx
        exit 1
    fi
    systemctl start nginx
fi

# Create nginx configuration
cat > "$config_file" <<EOF
# 1. HTTP redirekcija ka HTTPS bez www
server {
    listen 80;
    server_name $domain www.$domain;
    return 301 https://$domain\$request_uri;
}

# 2. HTTPS redirekcija za www -> bez www
server {
    listen 443 ssl;
    server_name www.$domain;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://$domain\$request_uri;
}

# 3. Glavni server za $domain (HTTPS, bez www)
server {
    listen 443 ssl;
    server_name $domain;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root $webroot_path;
    index index.html index.htm;
    
    location / {
        try_files \$uri \$uri/ =404;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    }

    access_log /var/log/nginx/$domain.access.log;
    error_log /var/log/nginx/$domain.error.log;
}
EOF

# Enable site
ln -sf "$config_file" "$sites_enabled"

# Test and reload nginx
if nginx -t; then
    systemctl reload nginx
    print_success "Nginx configured for $domain"
    print_success "Site available at: https://$domain"
else
    print_error "Nginx configuration test failed"
    exit 1
fi
