# 🅿️ AIoT Smart Parking System – Production AWS Terraform IaC

Production-ready **Infrastructure as Code (IaC)** project for deploying an **AIoT Smart Parking Web Application** on Amazon Web Services (AWS) using **Terraform (>= 1.5.0)**.

---

## 🏛️ System Architecture & Data Flow

```
                                  [ Internet / Users ]
                                           │
                                           ▼ HTTP / HTTPS (80, 443)
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     AWS VPC (10.0.0.0/16)                                        │
│                                                                                                  │
│  ┌──────────────────────────────────────────────┐    ┌────────────────────────────────────────┐  │
│  │         Public Subnet (10.0.1.0/24)          │    │      Private Subnet 1 (10.0.2.0/24)    │  │
│  │                                              │    │      Private Subnet 2 (10.0.3.0/24)    │  │
│  │   ┌───────────────────────────────────────┐  │    │                                        │  │
│  │   │        EC2 Application Server         │  │    │   ┌─────────────────────────────────┐  │  │
│  │   │  ┌─────────────────────────────────┐  │  │    │   │         AWS RDS MySQL 8.0       │  │  │
│  │   │  │   Nginx Reverse Proxy (:80)     │  │  │    │   │       (Multi-AZ Configurable)   │  │  │
│  │   │  └──────────────┬──────────────────┘  │  │    │   │        Port: 3306 (Encrypted)   │  │  │
│  │   │                 ▼                     │  │    │   └────────────────▲────────────────┘  │  │
│  │   │  ┌─────────────────────────────────┐  │  │    │                    │ (SG Restricted)   │  │
│  │   │  │   Docker / Docker Compose       │  │  │    └────────────────────┼───────────────────┘  │
│  │   │  │  ┌───────────────────────────┐  │  │  │                         │                      │
│  │   │  │  │  Node.js Express Backend  ├──┼──┼────────────────────────────┘                      │
│  │   │  │  └───────────┬───────────────┘  │  │  │                                                │
│  │   │  └──────────────┼──────────────────┘  │  │                                                │
│  │   │                 │ (IAM Role Profile)  │  │                                                │
│  │   └─────────────────┼─────────────────────┘  │                                                │
│  │                     │                        │                                                │
│  │   ┌─────────────────▼─────────────────────┐  │                                                │
│  │   │      NAT Gateway & Elastic IP         │  │                                                │
│  │   └───────────────────────────────────────┘  │                                                │
│  └──────────────────────────────────────────────┘                                                │
└────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │   Amazon S3 Bucket  │ │   Amazon SQS Queue  │ │  Amazon DynamoDB    │
      │  - Parking Assets   │ │  - Async Events     │ │  - Real-Time Status │
      │  - Receipts/Exports │ │  - DLQ Enabled      │ │  - Low-latency TTL  │
      │  - AES256 Encrypted │ └──────────┬──────────┘ └──────────▲──────────┘
      └─────────────────────┘            │                       │
                                         ▼                       │
                              ┌─────────────────────┐            │
                              │   AWS Lambda        ├────────────┘
                              │  - Event Processor  │
                              │  - Serverless Node  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   Amazon SNS Topic  │
                              │  - Alert Broadcast  │
                              │  - SMS / Email      │
                              └──────────▲──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  Amazon CloudWatch  │
                              │  - EC2 / RDS Alarms │
                              │  - CPU & Storage    │
                              └─────────────────────┘
```

### End-to-End Component Flow:

1. **`VPC → EC2 → Docker → Nginx → Node.js`**: Users make HTTP/HTTPS requests that hit the public-facing EC2 instance. Nginx receives client requests on port 80/443 and proxies them to the Dockerized Node.js application container on port 5000.
2. **`EC2 → RDS MySQL`**: Node.js connects securely to RDS MySQL 8.0 deployed in private subnets across availability zones. Ingress is strictly locked to the EC2 security group on port 3306.
3. **`EC2 → S3`**: Static assets, parking floor maps, receipts, and export files are persisted directly into an S3 bucket with server-side encryption and public access blocks.
4. **`EC2 → SQS → Lambda → DynamoDB`**: Asynchronous events (slot reservations, IoT sensor updates, payment confirmations) are published to an SQS queue (with DLQ). AWS Lambda consumes messages from SQS and records live state into Amazon DynamoDB with single-digit millisecond latency.
5. **`Lambda → SNS`**: Critical booking events or abnormal slot occupancy triggers SNS notifications to notify users and parking operators.
6. **`AWS Resources → CloudWatch`**: Metrics from EC2, RDS, and Lambda are tracked. CloudWatch alarms automatically publish to Amazon SNS when CPU exceeds 80% or RDS storage falls below 5GB.

---

## 📁 Repository Structure

```
terraform-smart-parking/
│
├── main.tf                    # Root orchestration: instantiates modules & CloudWatch alarms
├── provider.tf                # AWS provider configuration and global default tags
├── variables.tf               # Root variable declarations with types & descriptions
├── outputs.tf                 # Root output definitions (no sensitive credentials exposed)
├── versions.tf                # Terraform (>= 1.5.0) & AWS provider version constraints
├── terraform.tfvars.example   # Example configuration parameters
├── backend.tf.example         # Example for remote state in S3 + DynamoDB locking
├── .gitignore                 # Excludes .tfstate, *.tfvars, and crash logs
│
├── modules/
│   ├── vpc/                   # VPC, Public & Multi-AZ Private Subnets, IGW, NAT Gateway, RTs
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── ec2/                   # EC2 Instance, IAM Role/Profile, Security Groups, user_data.sh
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── user_data.sh
│   │
│   ├── rds/                   # RDS MySQL 8.0, DB Subnet Group, Security Group, Multi-AZ
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── s3/                    # S3 Bucket with versioning, SSE-S3 encryption & public block
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── lambda/                # Serverless event processor, IAM Role, CloudWatch Logs
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── sqs/                   # SQS Queue with Dead-Letter Queue (DLQ) & Server-Side Encryption
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── sns/                   # SNS Alert Topic with KMS/SSE encryption
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── dynamodb/              # DynamoDB Table for real-time telemetry (PITR enabled, TTL)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
└── README.md
```

---

## 🏷️ Standard Tagging Strategy

All AWS resources created by this Terraform configuration inherit consistent tags via `provider.tf`:

| Tag Key | Default Value | Description |
|---|---|---|
| `Project` | `"SmartParking"` | Name of the project |
| `Environment` | `var.environment` (e.g., `production`, `staging`, `dev`) | Environment tier |
| `ManagedBy` | `"Terraform"` | Provisioned via Infrastructure as Code |

---

## 🚀 Deployment Guide & CLI Workflow

### Prerequisites
* [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) (version `>= 1.5.0`)
* [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with administrative credentials (`aws configure`)

---

### Step 1: Configure Variables

Create your local variable definition file from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region          = "us-east-1"
environment         = "production"
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"
enable_nat_gateway  = true
ec2_instance_type   = "t3.micro"
ssh_allowed_cidr    = "203.0.113.50/32" # Restrict to your client IP
rds_instance_class  = "db.t3.micro"
rds_database_name   = "smartparking"
rds_username        = "dbadmin"
rds_password        = "YourStrongPasswordHere123!" # Sensitive password
rds_storage         = 20
rds_multi_az        = false # Set to true in production
s3_bucket_name      = "smart-parking-storage-bucket-prod-unique123"
dynamodb_table_name = "smart-parking-transactions"
sqs_queue_name      = "smart-parking-events"
sns_topic_name      = "smart-parking-alerts"
lambda_runtime      = "nodejs18.x"
```

---

### Step 2: Essential Terraform CLI Commands

#### 1. Initialize Terraform
Initializes working directory and downloads required provider plugins and submodules:
```bash
terraform init
```

#### 2. Canonical Code Formatting
Formats all configuration files in the root and subdirectories to canonical Terraform style:
```bash
terraform fmt -recursive
```

#### 3. Syntax & Consistency Validation
Validates the syntax and references within configuration files:
```bash
terraform validate
```

#### 4. Preview Execution Plan
Generates an execution plan to verify proposed infrastructure additions/modifications:
```bash
terraform plan -out=tfplan
```

#### 5. Apply Changes
Provisions the complete cloud infrastructure on AWS:
```bash
terraform apply tfplan
```

#### 6. Destroy Infrastructure
Safely terminates all provisioned resources to prevent unwanted AWS costs:
```bash
terraform destroy
```

---

## 🔒 Remote State Management with S3 & DynamoDB Locking

To prevent race conditions and protect state files across a DevOps team:

### 1. Provision S3 Bucket & DynamoDB Lock Table
```bash
# S3 Bucket for State
aws s3api create-bucket \
  --bucket smart-parking-tfstate-$(aws sts get-caller-identity --query Account --output text) \
  --region us-east-1

# Enable Versioning
aws s3api put-bucket-versioning \
  --bucket smart-parking-tfstate-$(aws sts get-caller-identity --query Account --output text) \
  --versioning-configuration Status=Enabled

# Enable Default Encryption
aws s3api put-bucket-encryption \
  --bucket smart-parking-tfstate-$(aws sts get-caller-identity --query Account --output text) \
  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

# DynamoDB Table for Distributed State Locking
aws dynamodb create-table \
  --table-name terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Activate the Remote Backend
Copy `backend.tf.example` to `backend.tf` and run:
```bash
terraform init -migrate-state
```

---

## 🔄 DevOps Integration & CI/CD Pipeline

### Recommended GitHub Actions Workflow (`.github/workflows/terraform.yml`)

```yaml
name: "Terraform Infrastructure CI/CD"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  terraform:
    name: "Terraform Lint, Security Scan & Deploy"
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform-smart-parking

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsTerraformRole
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Run Trivy Security IaC Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: './terraform-smart-parking'
          severity: 'CRITICAL,HIGH'

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        env:
          TF_VAR_rds_password: ${{ secrets.RDS_MASTER_PASSWORD }}

      - name: Terraform Apply (Main branch only)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan
```

### Multi-Environment Strategy (Dev vs Prod)
For environment isolation, use directory-based or workspace-based segregation:
- **Workspaces:** `terraform workspace new dev` vs `terraform workspace new prod`
- **Variable files:** `terraform apply -var-file=environments/dev.tfvars` vs `terraform apply -var-file=environments/prod.tfvars`

---

## 🛡️ Security Highlights

- **Network Isolation:** RDS MySQL is isolated in private subnets with no public IP and only accepts TCP traffic from the EC2 security group.
- **IAM Least Privilege:** EC2 and Lambda instances utilize IAM instance profiles and execution roles instead of static long-lived AWS access keys.
- **Data Protection at Rest:** S3 bucket encryption (SSE-S3), DynamoDB encryption, and RDS EBS volume encryption are enabled by default.
- **Public Access Prevention:** S3 public access block configuration prevents accidental object leakage.
- **Secret Protection:** Sensitive variables (e.g., RDS master password) are flagged with `sensitive = true` to omit values from console output and execution logs.

