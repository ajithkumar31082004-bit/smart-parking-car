# ==============================================================================
# Quick Standalone EC2 Deployment for AIoT Smart Parking System
# Run this from the `quick-deploy/` folder: `cd quick-deploy && terraform init && terraform apply`
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Variables
variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID (Ubuntu 22.04 LTS / AL2023). Defaults to latest Ubuntu 22.04 LTS in region."
  type        = string
  default     = null
}

variable "repo_url" {
  description = "Smart Parking Git repository URL"
  type        = string
  default     = "https://github.com/ajithkumar31082004-bit/smart-parking-car.git"
}

# 2. Dynamic Data Source for Default VPC & Ubuntu AMI
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Security Group for Web Traffic & SSH
resource "aws_security_group" "allow_web" {
  name        = "smartparking-allow-web"
  description = "Allow SSH, HTTP, HTTPS and Backend Ports"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP Web Application"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS Secure Web"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Node.js Backend Port"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Grafana Monitoring Dashboard"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "smartparking-allow-web"
    Project = "SmartParking"
  }
}

# 4. EC2 Instance with Automated Application Bootstrapping
resource "aws_instance" "smart_parking_server" {
  ami                         = var.ami_id != null ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  associate_public_ip_address = true

  vpc_security_group_ids = [
    aws_security_group.allow_web.id
  ]

  user_data_replace_on_change = true

  user_data = <<-EOF
#!/bin/bash
set -e

# 1. Update and install Nginx, Git, Node.js, and Docker
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl docker.io docker-compose

systemctl enable docker
systemctl start docker
systemctl enable nginx
systemctl start nginx

# 2. Clean default web root
rm -rf /var/www/html/*

# 3. Clone Smart Parking repository
cd /tmp
rm -rf smart-parking-car
git clone ${var.repo_url} /tmp/smart-parking-car

# 4. Copy static frontend web files directly to Nginx web root
cp -r /tmp/smart-parking-car/*.html /var/www/html/ 2>/dev/null || true
cp -r /tmp/smart-parking-car/frontend /var/www/html/ 2>/dev/null || true
cp -r /tmp/smart-parking-car/docs /var/www/html/ 2>/dev/null || true
cp -r /tmp/smart-parking-car/3d-demo.html /var/www/html/ 2>/dev/null || true

# Set permissions for Nginx
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# 5. Setup Application backend directory
mkdir -p /opt/smart-parking
cp -r /tmp/smart-parking-car/* /opt/smart-parking/
cd /opt/smart-parking

# Create default .env file
cat <<'ENVEOF' > /opt/smart-parking/.env
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=*
JWT_SECRET=smartpark-ai-super-secret-jwt-token-quick-deploy-32chars
ENVEOF

# 6. Configure Nginx Reverse Proxy (Frontend + API routing)
cat <<'NGINXEOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html index.htm;

    # Serve static frontend web pages (index.html, booking.html, slots.html, etc.)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend container
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
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
NGINXEOF

# 7. Restart Nginx
nginx -t && systemctl restart nginx

# 8. Start Docker Compose backend stack
if [ -f "/opt/smart-parking/docker-compose.prod.yml" ]; then
    docker-compose -f /opt/smart-parking/docker-compose.prod.yml up -d --build || docker-compose up -d || true
elif [ -f "/opt/smart-parking/docker-compose.yml" ]; then
    docker-compose -f /opt/smart-parking/docker-compose.yml up -d --build || true
fi

echo "Smart Parking Application Deployment Completed Successfully!"
EOF

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name    = "SmartParking-WebServer"
    Project = "SmartParking"
  }
}

# 5. Outputs
output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.smart_parking_server.id
}

output "public_ip" {
  description = "The public IP of the EC2 instance"
  value       = aws_instance.smart_parking_server.public_ip
}

output "website_url" {
  description = "The public website URL for the Smart Parking application"
  value       = "http://${aws_instance.smart_parking_server.public_ip}"
}
