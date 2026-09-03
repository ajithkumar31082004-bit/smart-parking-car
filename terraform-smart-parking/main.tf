locals {
  common_tags = {
    Project     = "SmartParking"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 1. VPC Module (Networking & NAT Gateway)
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr           = var.vpc_cidr
  public_subnet_cidr = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
  enable_nat_gateway  = var.enable_nat_gateway

  tags = local.common_tags
}

# 2. RDS Module (MySQL 8.0 Database)
module "rds" {
  source = "./modules/rds"

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  allowed_cidr_blocks = [module.vpc.vpc_cidr_block]

  engine            = "mysql"
  engine_version    = "8.0"
  port              = 3306
  instance_class    = var.rds_instance_class
  database_name     = var.rds_database_name
  username          = var.rds_username
  password          = var.rds_password
  allocated_storage = var.rds_storage
  multi_az          = var.rds_multi_az

  tags = local.common_tags
}

# 3. EC2 Module (Application Server & Nginx Reverse Proxy)
module "ec2" {
  source = "./modules/ec2"

  vpc_id           = module.vpc.vpc_id
  subnet_id        = module.vpc.public_subnet_id
  instance_type    = var.ec2_instance_type
  ami_id           = var.ec2_ami
  ssh_allowed_cidr = var.ssh_allowed_cidr
  key_name         = var.ec2_key_name

  # Application & Cloud Parameters for User Data Bootstrapping
  app_repo_url        = var.app_repo_url
  app_branch          = var.app_branch
  environment         = var.environment
  jwt_secret          = var.jwt_secret
  db_host             = module.rds.address
  db_port             = module.rds.port
  db_name             = module.rds.database_name
  db_user             = var.rds_username
  db_password         = var.rds_password
  aws_region          = var.aws_region
  s3_bucket_name      = module.s3.bucket_name
  sqs_queue_url       = module.sqs.queue_url
  sns_topic_arn       = module.sns.arn
  dynamodb_table_name = module.dynamodb.table_name

  tags = local.common_tags
}


# 4. S3 Module (Object Storage for Assets & Backups)
module "s3" {
  source = "./modules/s3"

  bucket_name = var.s3_bucket_name

  tags = local.common_tags
}

# 5. SQS Module (Asynchronous Message & Event Queue)
module "sqs" {
  source = "./modules/sqs"

  queue_name = var.sqs_queue_name

  tags = local.common_tags
}

# 6. SNS Module (Notification & Alarm Broadcast Topic)
module "sns" {
  source = "./modules/sns"

  topic_name         = var.sns_topic_name
  notification_email = var.sns_notification_email

  tags = local.common_tags
}


# 7. DynamoDB Module (Real-Time Slot Status NoSQL Table)
module "dynamodb" {
  source = "./modules/dynamodb"

  table_name = var.dynamodb_table_name

  tags = local.common_tags
}

# 8. Lambda Module (Serverless Booking & Telemetry Processor)
module "lambda" {
  source = "./modules/lambda"

  function_name = "smart-parking-event-processor"
  runtime       = var.lambda_runtime

  environment_variables = {
    ENVIRONMENT    = var.environment
    S3_BUCKET      = module.s3.bucket_name
    DYNAMODB_TABLE = module.dynamodb.table_name
    SQS_QUEUE_URL  = module.sqs.queue_url
    SNS_TOPIC_ARN  = module.sns.arn
    DB_HOST        = module.rds.address
    DB_PORT        = tostring(module.rds.port)
    DB_NAME        = module.rds.database_name
  }

  tags = local.common_tags
}

# 9. ECR Module (Elastic Container Registry)
module "ecr" {
  source = "./modules/ecr"

  repository_name = "smartpark-ai"
  tags            = local.common_tags
}

# ==============================================================================
# 9. CloudWatch Alarms & Monitoring Integration
# ==============================================================================

# EC2 High CPU Utilization Alarm (> 80% for 2 consecutive periods)
resource "aws_cloudwatch_metric_alarm" "ec2_high_cpu" {
  alarm_name          = "smart-parking-ec2-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when EC2 server CPU exceeds 80%"
  alarm_actions       = [module.sns.arn]

  dimensions = {
    InstanceId = module.ec2.instance_id
  }

  tags = local.common_tags
}

# RDS Low Free Storage Space Alarm (< 5 GB remaining)
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "smart-parking-rds-low-storage"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  alarm_description   = "Alarm when RDS free storage falls below 5 GB"
  alarm_actions       = [module.sns.arn]

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_id
  }

  tags = local.common_tags
}

# RDS High CPU Utilization Alarm (> 80%)
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "smart-parking-rds-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when RDS database CPU exceeds 80%"
  alarm_actions       = [module.sns.arn]

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_id
  }

  tags = local.common_tags
}

# Lambda Execution Errors Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "smart-parking-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alarm when Lambda event processor encounters errors"
  alarm_actions       = [module.sns.arn]

  dimensions = {
    FunctionName = module.lambda.function_name
  }

  tags = local.common_tags
}

