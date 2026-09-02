variable "table_name" {
  description = "The name of the DynamoDB table"
  type        = string
  default     = "smart-parking-transactions"
}

variable "billing_mode" {
  description = "Controls how you are charged for read and write throughput (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "hash_key" {
  description = "The attribute to use as the hash (partition) key"
  type        = string
  default     = "parking_slot_id"
}

variable "hash_key_type" {
  description = "The type of the hash key (S, N, or B)"
  type        = string
  default     = "S"
}

variable "range_key" {
  description = "The attribute to use as the range (sort) key"
  type        = string
  default     = "timestamp"
}

variable "range_key_type" {
  description = "The type of the range key (S, N, or B)"
  type        = string
  default     = "N"
}

variable "enable_streams" {
  description = "Whether Streams are enabled"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "When an item in the table is modified, StreamViewType determines what information is written to the table's stream"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
}

variable "point_in_time_recovery" {
  description = "Enable DynamoDB Point-in-Time Recovery"
  type        = bool
  default     = true
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
