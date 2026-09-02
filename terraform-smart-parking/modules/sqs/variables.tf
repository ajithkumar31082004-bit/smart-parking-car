variable "queue_name" {
  description = "The name of the SQS queue"
  type        = string
  default     = "smart-parking-events"
}

variable "message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message"
  type        = number
  default     = 86400 # 1 day
}

variable "visibility_timeout_seconds" {
  description = "The visibility timeout for the queue in seconds"
  type        = number
  default     = 30
}

variable "enable_dlq" {
  description = "Enable Dead-Letter Queue (DLQ)"
  type        = bool
  default     = true
}

variable "max_receive_count" {
  description = "Max times a message can be delivered before sending to DLQ"
  type        = number
  default     = 5
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
