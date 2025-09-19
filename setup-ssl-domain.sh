#!/bin/bash

# SSL Certificate and Nginx Setup Script
# Usage: ./setup-ssl-domain.sh <domain> [email] [webroot_path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root - this is required for SSL certificate setup"
        # Allow root for SSL setup
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate domain
validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid domain format: $domain"
        exit 1
    fi
}

# Function to check if domain resolves
check_domain_resolution() {
    local domain=$1
    print_status "Checking if domain $domain resolves to this server..."
    
    if ! nslookup "$domain" >/dev/null 2>&1; then
        print_warning "Domain $domain does not resolve. Make sure DNS is properly configured."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Domain $domain resolves correctly"
    fi
}

# Function to install required packages
install_dependencies() {
    print_status "Installing required packages..."
    
    if command_exists apt-get; then
        sudo apt-get update
        sudo apt-get install -y nginx certbot python3-certbot-nginx
    elif command_exists yum; then
        sudo yum install -y nginx certbot python3-certbot-nginx
    elif command_exists dnf; then
        sudo dnf install -y nginx certbot python3-certbot-nginx
    else
        print_error "Unsupported package manager. Please install nginx and certbot manually."
        exit 1
    fi
}

# Function to create nginx configuration
create_nginx_config() {
    local domain=$1
    local webroot_path=$2
    local config_file="/etc/nginx/sites-available/$domain"
    local sites_enabled="/etc/nginx/sites-enabled/$domain"
    
    print_status "Creating nginx configuration for $domain..."
    
    # Create sites-available directory if it doesn't exist
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Create log directory if it doesn't exist
    sudo mkdir -p /var/log/nginx
    
    # Create nginx configuration
    sudo tee "$config_file" > /dev/null <<EOF
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

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://$domain\$request_uri;
}

# 3. Glavni server za $domain (HTTPS, bez www)
server {
    listen 443 ssl;
    server_name $domain;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Web root
    root $webroot_path;
    index index.html index.htm index.php;
    
    # Main location block
    location / {
        try_files \$uri \$uri/ =404;
        
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    }
    
    # PHP support (uncomment if needed)
    # location ~ \.php$ {
    #     fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    #     fastcgi_index index.php;
    #     fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
    #     include fastcgi_params;
    # }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/$domain.access.log;
    error_log /var/log/nginx/$domain.error.log;
}
EOF

    # Enable the site
    sudo ln -sf "$config_file" "$sites_enabled"
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_success "Nginx configuration created and tested successfully"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

# Function to obtain SSL certificate
obtain_ssl_certificate() {
    local domain=$1
    local email=$2
    local webroot_path=$3
    
    print_status "Obtaining SSL certificate for $domain..."
    
    # Create webroot directory if it doesn't exist
    sudo mkdir -p "$webroot_path"
    
    # Create a simple index.html if it doesn't exist
    if [[ ! -f "$webroot_path/index.html" ]]; then
        sudo tee "$webroot_path/index.html" > /dev/null <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to $domain</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to $domain</h1>
        <p>Your SSL certificate has been successfully installed!</p>
        <p>This site is now secure with HTTPS.</p>
    </div>
</body>
</html>
EOF
    fi
    
    # Set proper permissions
    sudo chown -R www-data:www-data "$webroot_path" 2>/dev/null || sudo chown -R nginx:nginx "$webroot_path" 2>/dev/null || true
    sudo chmod -R 755 "$webroot_path"
    
    # Obtain certificate using webroot method
    if sudo certbot certonly --webroot -w "$webroot_path" -d "$domain" -d "www.$domain" --email "$email" --agree-tos --non-interactive; then
        print_success "SSL certificate obtained successfully for $domain"
    else
        print_error "Failed to obtain SSL certificate for $domain"
        exit 1
    fi
}

# Function to setup auto-renewal
setup_auto_renewal() {
    print_status "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    sudo tee /usr/local/bin/renew-ssl.sh > /dev/null <<'EOF'
#!/bin/bash
# SSL Certificate Auto-Renewal Script

/usr/bin/certbot renew --quiet
if [ $? -eq 0 ]; then
    /usr/bin/systemctl reload nginx
    echo "$(date): SSL certificates renewed successfully" >> /var/log/ssl-renewal.log
else
    echo "$(date): SSL certificate renewal failed" >> /var/log/ssl-renewal.log
fi
EOF

    sudo chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add cron job for auto-renewal (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 12,0 * * * /usr/local/bin/renew-ssl.sh") | crontab -
    
    print_success "Auto-renewal setup completed"
}

# Function to restart services
restart_services() {
    print_status "Restarting nginx service..."
    
    if sudo systemctl restart nginx; then
        print_success "Nginx restarted successfully"
    else
        print_error "Failed to restart nginx"
        exit 1
    fi
    
    # Enable nginx to start on boot
    sudo systemctl enable nginx
}

# Function to display summary
display_summary() {
    local domain=$1
    local webroot_path=$2
    
    echo
    print_success "=== SSL Setup Complete ==="
    echo
    echo "Domain: $domain"
    echo "Web Root: $webroot_path"
    echo "SSL Certificate: /etc/letsencrypt/live/$domain/"
    echo "Nginx Config: /etc/nginx/sites-available/$domain"
    echo
    echo "Your website should now be accessible at:"
    echo "  https://$domain"
    echo "  https://www.$domain"
    echo
    print_status "SSL certificates will auto-renew twice daily"
    echo
}

# Main function
main() {
    # Check if running as root
    check_root
    
    # Check arguments
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 <domain> [email] [webroot_path]"
        echo
        echo "Examples:"
        echo "  $0 example.com admin@example.com"
        echo "  $0 example.com admin@example.com /var/www/html"
        echo
        exit 1
    fi
    
    local domain=$1
    local email=${2:-"admin@$domain"}
    local webroot_path=${3:-"/var/www/$domain"}
    
    print_status "Starting SSL setup for domain: $domain"
    print_status "Email: $email"
    print_status "Web root: $webroot_path"
    echo
    
    # Validate domain
    validate_domain "$domain"
    
    # Check if domain resolves
    check_domain_resolution "$domain"
    
    # Check if required commands exist
    if ! command_exists nginx; then
        print_status "Nginx not found. Installing dependencies..."
        install_dependencies
    fi
    
    if ! command_exists certbot; then
        print_status "Certbot not found. Installing dependencies..."
        install_dependencies
    fi
    
    # Obtain SSL certificate first
    obtain_ssl_certificate "$domain" "$email" "$webroot_path"
    
    # Create nginx configuration after SSL certificate is obtained
    create_nginx_config "$domain" "$webroot_path"
    
    # Setup auto-renewal
    setup_auto_renewal
    
    # Restart services
    restart_services
    
    # Display summary
    display_summary "$domain" "$webroot_path"
}

# Run main function with all arguments
main "$@"
