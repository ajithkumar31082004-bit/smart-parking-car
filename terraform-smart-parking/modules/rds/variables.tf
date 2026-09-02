variable "allocated_storage" {
  description = "The allocated storage in gigabytes"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "The upper limit to which Amazon RDS can automatically scale storage"
  type        = number
  default     = 100
}

variable "instance_class" {
  description = "The instance type of the RDS database"
  type        = string
  default     = "db.t3.micro"
}

variable "database_name" {
  description = "The name of the database to create when the DB instance is created"
  type        = string
  default     = "smartparking"
}

variable "username" {
  description = "Username for the master DB user"
  type        = string
  default     = "dbadmin"
}

variable "password" {
  description = "Password for the master DB user"
  type        = string
  sensitive   = true
}

variable "engine" {
  description = "The database engine to use (e.g. mysql, postgres)"
  type        = string
  default     = "mysql"
}

variable "engine_version" {
  description = "The engine version to use"
  type        = string
  default     = "8.0"
}

variable "port" {
  description = "The port on which the DB accepts connections"
  type        = number
  default     = 3306
}

variable "multi_az" {
  description = "Specifies if the RDS instance is multi-AZ"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "The days to retain automated backups for (Free Tier accounts support max 1 day)"
  type        = number
  default     = 1
}


variable "skip_final_snapshot" {
  description = "Determines whether a final DB snapshot is created before deleting the instance"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "The VPC ID where the RDS instance is deployed"
  type        = string
}

variable "subnet_ids" {
  description = "A list of VPC subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs allowed to access the database"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the database (e.g. VPC CIDR)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}


