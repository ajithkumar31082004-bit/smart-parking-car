variable "repository_name" {
  type        = string
  description = "Name of the ECR container repository"
  default     = "smartpark-ai"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
