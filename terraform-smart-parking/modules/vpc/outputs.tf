output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "The ID of the primary private subnet"
  value       = aws_subnet.private.id
}

output "private_subnet_ids" {
  description = "List of all private subnet IDs (including secondary for multi-AZ RDS)"
  value       = [aws_subnet.private.id, aws_subnet.private_secondary.id]
}
