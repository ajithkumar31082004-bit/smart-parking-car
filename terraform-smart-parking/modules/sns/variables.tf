variable "topic_name" {
  description = "The name of the SNS topic"
  type        = string
  default     = "smart-parking-alerts"
}

variable "display_name" {
  description = "The display name for the SNS topic"
  type        = string
  default     = "Smart Parking Alerts"
}

variable "notification_email" {
  description = "Email address to subscribe to the SNS topic for parking alerts"
  type        = string
  default     = null
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}

