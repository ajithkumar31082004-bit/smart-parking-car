provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SmartParking"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
