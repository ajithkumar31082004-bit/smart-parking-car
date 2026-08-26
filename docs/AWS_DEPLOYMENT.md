# SmartPark AI — AWS Cloud Architecture & Deployment Guide

This document outlines the enterprise AWS cloud architecture, containerized infrastructure, security layers, and deployment procedures for **SmartPark AI**.

---

## 1. Cloud Architecture Overview

```
                      +-----------------------------+
                      |         END USERS           |
                      |   (Mobile App / Web Browser)|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |       Amazon CloudFront     | (CDN & SSL Edge Termination)
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Application Load Balancer | (ALB in Public Subnets)
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |      AWS ECS (Fargate)      | (Private Subnets)
                      |  Node.js API + ML Services  |
                      +--------------+--------------+
                                     |
            +------------------------+------------------------+
            |                        |                        |
            v                        v                        v
+-----------------------+ +--------------------+ +------------------------+
|  Amazon Aurora / RDS  | |   Amazon S3 Bucket | |  Amazon SNS & SES      |
|  PostgreSQL / MySQL   | | (Passes & Invoices)| | (SMS/Email Alerts)    |
+-----------------------+ +--------------------+ +------------------------+
            ^
            |
+-----------+-----------+
|  AWS Secrets Manager  |
|  & AWS CloudWatch     |
+-----------------------+
```

---

## 2. AWS Services Matrix

| AWS Service | Role in SmartPark AI Platform |
| :--- | :--- |
| **Amazon CloudFront** | Low-latency global content delivery, edge caching for static assets, DDoS protection via AWS Shield. |
| **Amazon Route 53** | High-availability DNS routing with health checks and failover routing policies. |
| **Application Load Balancer (ALB)** | Distributes incoming HTTPS traffic across multiple ECS Fargate containers with SSL offloading. |
| **AWS ECS (Fargate)** | Serverless container execution for backend Express API and Python ML microservices. Auto-scales from 2 to 20 tasks based on CPU/RAM utilization. |
| **Amazon RDS / Aurora** | Managed relational database hosting 17 normalized tables with Multi-AZ replication and automated daily snapshots. |
| **Amazon S3** | Encrypted object storage for generated digital passes, invoice PDFs, and vehicle photo records. |
| **AWS Secrets Manager** | Secure storage and automatic rotation of JWT keys, database credentials, and payment gateway tokens. |
| **Amazon CloudWatch** | Centralized log ingestion, anomaly metrics, alarm triggers on HTTP 5xx errors, and container performance monitoring. |
| **Amazon SNS / SES** | Automated push notifications for booking confirmations, slot expiration alerts, and EV charge completion. |

---

## 3. Production Deployment Commands

### Step A: Build & Push Docker Image to Amazon ECR
```bash
# Authenticate Docker to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -t smartpark-ai:latest .
docker tag smartpark-ai:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smartpark-ai:latest

# Push image
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smartpark-ai:latest
```

### Step B: Deploy to ECS Fargate
```bash
# Update ECS Service with new task definition
aws ecs update-service \
  --cluster smartpark-production-cluster \
  --service smartpark-api-service \
  --force-new-deployment \
  --region us-east-1
```
