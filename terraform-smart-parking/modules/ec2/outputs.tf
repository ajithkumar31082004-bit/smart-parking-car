output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "The public IP address assigned to the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "private_ip" {
  description = "The private IP address assigned to the EC2 instance"
  value       = aws_instance.app.private_ip
}

output "security_group_id" {
  description = "The ID of the EC2 security group"
  value       = aws_security_group.ec2.id
}
