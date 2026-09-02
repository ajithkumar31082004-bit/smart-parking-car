variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
  default     = "smart-parking-processor"
}

variable "handler" {
  description = "The function entrypoint in code"
  type        = string
  default     = "index.handler"
}

variable "runtime" {
  description = "The runtime environment for the Lambda function"
  type        = string
  default     = "nodejs18.x"
}

variable "timeout" {
  description = "Amount of time Lambda function has to run in seconds"
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Amount of memory in MB Lambda function can use at runtime"
  type        = number
  default     = 128
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
