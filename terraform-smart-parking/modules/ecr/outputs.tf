output "repository_url" {
  description = "The URL of the repository"
  value       = aws_ecr_repository.app_repo.repository_url
}

output "repository_arn" {
  description = "The ARN of the repository"
  value       = aws_ecr_repository.app_repo.arn
}
