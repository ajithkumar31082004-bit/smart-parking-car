#!/bin/bash
set -euo pipefail

# Log all output to user_data.log for debugging
exec > >(tee /var/log/user_data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=========================================================="
echo "Starting AIoT Smart Parking Node Provisioning: $(date)"
echo "=========================================================="

# 1. Detect OS & Install Core Dependencies (Docker, Git, Nginx)
if command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
    echo "Detected Amazon Linux / RHEL / Fedora environment..."
    dnf update -y || yum update -y
    dnf install -y docker git nginx curl || yum install -y docker git nginx curl
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user || true
elif command -v apt-get >/dev/null 2>&1; then
    echo "Detected Ubuntu / Debian environment..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y docker.io git nginx curl ca-certificates
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu || true
fi

# 2. Install Docker Compose Plugin / Standalone Binary
echo "Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="v2.24.5"
curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# 3. Setup Project Application Directory
APP_DIR="/opt/smart-parking"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 4. Clone or Fetch Application Source Repository
REPO_URL="https://github.com/ajithkumar31082004-bit/smart-parking-car.git"
if [ ! -d "$APP_DIR/.git" ]; then
    echo "Cloning Smart Parking repository from ${REPO_URL}..."
    git clone "$REPO_URL" "$APP_DIR" || {
        echo "Git clone skipped or failed, initializing local docker-compose configuration..."
    }
else
    echo "Repository already present, pulling latest changes..."
    git -C "$APP_DIR" pull origin main || true
fi

# Ensure docker-compose.prod.yml or docker-compose.yml exists
if [ ! -f "$APP_DIR/docker-compose.yml" ] && [ -f "$APP_DIR/docker-compose.prod.yml" ]; then
    cp "$APP_DIR/docker-compose.prod.yml" "$APP_DIR/docker-compose.yml"
fi

# 5. Configure Systemd Service for Auto-Start on Boot & Failure Recovery
echo "Configuring systemd service for Smart Parking containerized stack..."
cat <<'EOF' > /etc/systemd/system/smart-parking.service
[Unit]
Description=AIoT Smart Parking Docker Compose Application
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/smart-parking
ExecStart=/usr/local/bin/docker-compose up -d --remove-orphans
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable smart-parking.service

# 6. Configure Nginx Reverse Proxy
echo "Configuring Nginx Reverse Proxy..."
cat <<'EOF' > /etc/nginx/conf.d/smart-parking.conf
server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

# Test & reload Nginx
systemctl enable nginx
nginx -t && systemctl restart nginx || echo "Nginx configuration will reload upon container startup"

# 7. Start the Application Stack
if [ -f "$APP_DIR/docker-compose.yml" ]; then
    echo "Starting Docker Compose stack..."
    systemctl start smart-parking.service || docker-compose up -d || true
fi

echo "=========================================================="
echo "Smart Parking Node Provisioning Complete: $(date)"
echo "=========================================================="

