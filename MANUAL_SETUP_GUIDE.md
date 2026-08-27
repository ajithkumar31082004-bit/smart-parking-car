# Complete Manual Setup Guide: End-to-End DevOps & Observability Workflow

This document provides step-by-step instructions to manually configure, build, run, and verify every service in your DevOps CI/CD and Observability pipeline.

---

## 🛠️ Pipeline Architecture Summary

```
                         👨💻 Developer
                              │
                              │ git push
                              ▼
                     ┌─────────────────┐
                     │     GitHub      │
                     │ Source Code     │
                     └────────┬────────┘
                              │
                              ▼
                  ┌──────────────────────┐
                  │   GitHub Actions     │
                  │                      │
                  │ • Checkout           │
                  │ • Install            │
                  │ • Test               │
                  │ • CodeQL             │
                  │ • Dependabot         │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │       Jenkins        │
                  │                      │
                  │ • Checkout           │
                  │ • Test               │
                  │ • SonarQube          │
                  │ • Docker Build       │
                  │ • Trivy Scan         │
                  └──────────┬───────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Docker Hub    │
                    │                 │
                    │ Docker Image    │
                    └────────┬────────┘
                             │
                       docker pull
                             │
                             ▼
                    ┌─────────────────┐
                    │      AWS EC2    │
                    │                 │
                    │     Docker      │
                    │        ↓        │
                    │   Application   │
                    │        ↓        │
                    │      Nginx      │
                    └────────┬────────┘
                             │
                             ▼
                         🌐 Website
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
          ┌─────────────┐         ┌─────────────┐
          │ Prometheus  │         │     Loki    │
          │ Monitoring  │         │    Logs     │
          └──────┬──────┘         └──────┬──────┘
                 │                       │
                 └───────────┬───────────┘
                             ▼
                       ┌───────────┐
                       │  Grafana  │
                       │ Dashboard │
                       └───────────┘
```

---

## Step 1: GitHub, Dependabot & CodeQL Setup

### 1.1 Dependabot Configuration
The [.github/dependabot.yml](file:///.github/dependabot.yml) file has been added to your repository.
- GitHub automatically parses this file to check npm and GitHub Actions dependencies weekly.
- **Verification**: Go to **GitHub Repo -> Security -> Dependabot** to view alerts and automated PRs.

### 1.2 CodeQL SAST Scan Setup
The [.github/workflows/codeql.yml](file:///.github/workflows/codeql.yml) workflow executes static application security testing on every `push` and `pull_request`.
- **Verification**: Go to **GitHub Repo -> Security -> Code scanning** to view scan findings.

---

## Step 2: SonarQube Server Setup (Manual Setup)

Run SonarQube locally or on a separate server using Docker:

```bash
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community
```

1. Open `http://<your-server-ip>:9000` in your browser (Default login: `admin` / `admin`).
2. Go to **Account -> Security -> Tokens** -> Generate a user token (e.g. `sonar-jenkins-token`).
3. Note your SonarQube URL (e.g. `http://<your-server-ip>:9000`).

---

## Step 3: Jenkins Server & Pipeline Setup (Manual Setup)

### 3.1 Run Jenkins using Docker
```bash
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

### 3.2 Install Required Plugins
In Jenkins (`http://<your-jenkins-ip>:8080`):
1. Navigate to **Manage Jenkins -> Plugins -> Available Plugins**.
2. Search & Install:
   - **Git Plugin**
   - **Pipeline**
   - **SonarQube Scanner**
   - **Docker Pipeline**
   - **SSH Agent Plugin**

### 3.3 Add Credentials in Jenkins
Navigate to **Manage Jenkins -> Credentials -> System -> Global credentials**:
1. `dockerhub-credentials`: Username & Password for Docker Hub.
2. `ec2-ssh-key`: SSH Private Key for AWS EC2 instance.
3. `sonar-token`: Secret text with SonarQube token.

### 3.4 Create Pipeline Job
1. Click **New Item** -> Name it `smartpark-pipeline` -> Select **Pipeline**.
2. Under **Pipeline Definition**, select **Pipeline script from SCM**.
3. SCM: **Git**, Repository URL: `https://github.com/<your-user>/smart-parking-car.git`.
4. Script Path: [Jenkinsfile](file:///Jenkinsfile).
5. Click **Save** and **Build Now**.

---

## Step 4: Docker Hub Manual Setup

1. Log into [Docker Hub](https://hub.docker.com).
2. Click **Create Repository** -> Name: `smartpark-ai` (Visibility: Public or Private).
3. Under **Account Settings -> Security**, click **New Access Token** and copy the generated token.

---

## Step 5: AWS EC2 Instance Manual Setup

### 5.1 Launch EC2 Instance
- **OS**: Ubuntu 24.04 LTS (t2.medium recommended for full observability stack).
- **Security Group Inbound Rules**:
  - `22` (SSH) — Your IP
  - `80` (HTTP) — Anywhere (0.0.0.0/0)
  - `5000` (Node App direct) — Optional
  - `3000` (Grafana Dashboard) — Anywhere (0.0.0.0/0)
  - `9090` (Prometheus) — Anywhere / Admin IP
  - `3100` (Loki) — Internal / Admin IP

### 5.2 Install Docker & Docker Compose on EC2
Run the following commands via SSH on EC2:

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-v2

# Start & Enable Docker
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

---

## Step 6: Deploying Application, Nginx & Observability Stack on EC2

### 6.1 Clone Repository on EC2
```bash
git clone https://github.com/<your-user>/smart-parking-car.git /home/ubuntu/smart-parking-car
cd /home/ubuntu/smart-parking-car
```

### 6.2 Set Up Environment Variables
Ensure `.env` contains production variables:
```bash
cat << 'EOF' > .env
PORT=5000
NODE_ENV=production
JWT_SECRET=b90b33ab932f6d36fda594ed2fc639b125da56aafe461303051a6ca8d5d8e210841d1ffa466d533acfa8ef0e0769c3fc27cee69c0e8bdb4e4cf5450ec22ab98d
DB_PATH=./database/smartpark.db
ALLOWED_ORIGINS=*
SUPABASE_URL=https://mcsucifgsrgthugebaqz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=yeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jc3VjaWZnc3JndGh1Z2ViYXF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2MTI5MiwiZXhwIjoyMTAzMzM3MjkyfQ.s7KVLKw2BKCmPRcc0ODZN6S3fpMwIa6GaBX44w-_UpU
EOF
```

### 6.3 Launch Full Stack using Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d
```

Check running containers:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Step 7: Verifying Services & Observability Dashboards

| Service | Access URL | Default Credentials / Notes |
|---|---|---|
| **Website (via Nginx)** | `http://<EC2-IP>` | Reverse proxies to application container on port 5000 |
| **Node App Direct** | `http://<EC2-IP>:5000` | Application Health: `http://<EC2-IP>:5000/api/health` |
| **Grafana Dashboard** | `http://<EC2-IP>:3000` | Login: `admin` / `admin` |
| **Prometheus Metrics** | `http://<EC2-IP>:9090` | Scrapes target `smartpark-app:5000` |
| **Loki Log Aggregator** | `http://<EC2-IP>:3100` | Receives container & nginx logs from Promtail |

### 7.1 Grafana Exploration
1. Log into Grafana at `http://<EC2-IP>:3000`.
2. Navigate to **Explore** -> Select Data Source **Prometheus** -> Enter query `up` to see active targets.
3. Select Data Source **Loki** -> Enter query `{job="nginx"}` or `{job="varlogs"}` to inspect live application and access logs.
