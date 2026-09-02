output "queue_id" {
  description = "The URL of the created Amazon SQS queue"
  value       = aws_sqs_queue.main.id
}

output "queue_url" {
  description = "The URL of the created Amazon SQS queue"
  value       = aws_sqs_queue.main.url
}

output "queue_arn" {
  description = "The ARN of the SQS queue"
  value       = aws_sqs_queue.main.arn
}

output "dlq_url" {
  description = "The URL of the dead letter queue"
  value       = var.enable_dlq ? aws_sqs_queue.dlq[0].url : null
}

output "dlq_arn" {
  description = "The ARN of the dead letter queue"
  value       = var.enable_dlq ? aws_sqs_queue.dlq[0].arn : null
}
