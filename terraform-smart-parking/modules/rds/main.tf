# RDS DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "smart-parking-db-subnet-group"
  description = "Subnet group for Smart Parking RDS database"
  subnet_ids  = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-db-subnet-group"
    }
  )
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "smart-parking-rds-sg"
  description = "Security group for Smart Parking RDS database"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = length(var.allowed_security_group_ids) > 0 ? [1] : []
    content {
      description     = "Database access from allowed application security groups"
      from_port       = var.port
      to_port         = var.port
      protocol        = "tcp"
      security_groups = var.allowed_security_group_ids
    }
  }

  dynamic "ingress" {
    for_each = length(var.allowed_cidr_blocks) > 0 ? [1] : []
    content {
      description = "Database access from VPC CIDR blocks"
      from_port   = var.port
      to_port     = var.port
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-rds-sg"
    }
  )
}


# RDS DB Instance
resource "aws_db_instance" "main" {
  identifier                  = "smart-parking-db"
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  engine                      = var.engine
  engine_version              = var.engine_version
  instance_class              = var.instance_class
  db_name                     = var.database_name
  username                    = var.username
  password                    = var.password
  port                        = var.port
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  publicly_accessible         = false
  multi_az                    = var.multi_az
  storage_encrypted           = true
  backup_retention_period     = var.backup_retention_period
  skip_final_snapshot         = var.skip_final_snapshot
  deletion_protection         = false
  auto_minor_version_upgrade  = true

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-rds-instance"
    }
  )
}

