resource "aws_sns_topic" "main" {
  name         = var.topic_name
  display_name = var.display_name

  # AWS-managed KMS key for server-side encryption
  kms_master_key_id = "alias/aws/sns"

  tags = merge(
    var.tags,
    {
      Name = var.topic_name
    }
  )
}

# Optional Email Subscription for Parking Alerts & CloudWatch Alarms
resource "aws_sns_topic_subscription" "email" {
  count     = var.notification_email != null && var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.main.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

