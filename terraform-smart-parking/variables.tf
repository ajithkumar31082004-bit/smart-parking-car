variable "aws_region" {
  description = "The AWS region to deploy all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "The deployment environment (e.g. production, staging, dev)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "The CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "The CIDR block for the private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "ec2_instance_type" {
  description = "The EC2 instance type for application hosting"
  type        = string
  default     = "t3.micro"
}

variable "ec2_ami" {
  description = "The custom AMI ID for the EC2 instance (optional, defaults to latest Amazon Linux 2023)"
  type        = string
  default     = null
}

variable "ssh_allowed_cidr" {
  description = "The CIDR block allowed to SSH into the EC2 instance"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ec2_key_name" {
  description = "Optional key pair name for SSH access to EC2"
  type        = string
  default     = null
}

variable "rds_instance_class" {
  description = "The database instance class for RDS"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_database_name" {
  description = "The name of the database to create"
  type        = string
  default     = "smartparking"
}

variable "rds_username" {
  description = "Master username for the RDS database"
  type        = string
  default     = "dbadmin"
}

variable "rds_password" {
  description = "Master password for the RDS database"
  type        = string
  sensitive   = true
}

variable "rds_storage" {
  description = "The allocated storage for the RDS database in GB"
  type        = number
  default     = 20
}

variable "s3_bucket_name" {
  description = "The globally unique name of the S3 bucket"
  type        = string
  default     = "smart-parking-storage-bucket-prod"
}

variable "dynamodb_table_name" {
  description = "The name of the DynamoDB table for parking telemetry/transactions"
  type        = string
  default     = "smart-parking-transactions"
}

variable "sqs_queue_name" {
  description = "The name of the Amazon SQS queue"
  type        = string
  default     = "smart-parking-events"
}

variable "sns_topic_name" {
  description = "The name of the Amazon SNS topic for parking alerts"
  type        = string
  default     = "smart-parking-alerts"
}

variable "sns_notification_email" {
  description = "Email address for SNS alert notifications"
  type        = string
  default     = "ajithkumar31082004@gmail.com"
}


variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for outbound internet access from private subnets"
  type        = bool
  default     = true
}

variable "rds_multi_az" {
  description = "Specifies if the RDS MySQL database is deployed across multiple availability zones"
  type        = bool
  default     = false
}

variable "lambda_runtime" {
  description = "The runtime environment for the Lambda processor"
  type        = string
  default     = "nodejs18.x"
}

variable "app_repo_url" {
  description = "Git repository URL for the Smart Parking application"
  type        = string
  default     = "https://github.com/ajithkumar31082004-bit/smart-parking-car.git"
}

variable "app_branch" {
  description = "Git branch to clone and deploy"
  type        = string
  default     = "main"
}

variable "jwt_secret" {
  description = "Secret key for signing JWT tokens in the Smart Parking application"
  type        = string
  default     = "smartpark-ai-super-secret-jwt-token-prod-key-32chars"
  sensitive   = true
}


