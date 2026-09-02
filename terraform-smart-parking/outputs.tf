output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = module.vpc.public_subnet_id
}

output "private_subnet_id" {
  description = "The ID of the primary private subnet"
  value       = module.vpc.private_subnet_id
}

output "ec2_instance_id" {
  description = "The ID of the EC2 instance"
  value       = module.ec2.instance_id
}

output "ec2_public_ip" {
  description = "The public IP of the EC2 application instance"
  value       = module.ec2.public_ip
}

output "ec2_private_ip" {
  description = "The private IP of the EC2 application instance"
  value       = module.ec2.private_ip
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = module.rds.endpoint
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = module.s3.bucket_name
}

output "sqs_queue_url" {
  description = "The URL of the SQS queue"
  value       = module.sqs.queue_url
}

output "sns_topic_arn" {
  description = "The ARN of the SNS topic"
  value       = module.sns.arn
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = module.dynamodb.table_name
}

output "lambda_function_arn" {
  description = "The ARN of the Lambda function"
  value       = module.lambda.arn
}

output "app_url" {
  description = "Public HTTP URL for the Smart Parking Web Application"
  value       = "http://${module.ec2.public_ip}"
}

output "grafana_dashboard_url" {
  description = "Public URL for Grafana Monitoring Dashboard"
  value       = "http://${module.ec2.public_ip}:3000"
}

output "prometheus_metrics_url" {
  description = "Public URL for Prometheus Metrics Server"
  value       = "http://${module.ec2.public_ip}:9090"
}

