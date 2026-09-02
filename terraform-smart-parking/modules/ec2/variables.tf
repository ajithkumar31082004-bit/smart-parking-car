variable "instance_type" {
  description = "The EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "The AMI ID to use for the instance. If null, latest Amazon Linux 2023 AMI is used."
  type        = string
  default     = null
}

variable "vpc_id" {
  description = "The VPC ID where the security group and instance reside"
  type        = string
}

variable "subnet_id" {
  description = "The public subnet ID to launch the instance in"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to connect via SSH"
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_name" {
  description = "Optional EC2 Key Pair name for SSH access"
  type        = string
  default     = null
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
  description = "JWT Secret for application authentication"
  type        = string
  sensitive   = true
  default     = "smartpark-ai-super-secret-jwt-token-prod-key-32chars"
}

variable "db_host" {
  description = "RDS MySQL Host"
  type        = string
  default     = ""
}

variable "db_port" {
  description = "RDS MySQL Port"
  type        = number
  default     = 3306
}

variable "db_name" {
  description = "RDS MySQL Database Name"
  type        = string
  default     = "smartparking"
}

variable "db_user" {
  description = "RDS MySQL Username"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "RDS MySQL Password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "S3 Bucket Name"
  type        = string
  default     = ""
}

variable "sqs_queue_url" {
  description = "SQS Queue URL"
  type        = string
  default     = ""
}

variable "sns_topic_arn" {
  description = "SNS Topic ARN"
  type        = string
  default     = ""
}

variable "dynamodb_table_name" {
  description = "DynamoDB Table Name"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment Environment"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}

