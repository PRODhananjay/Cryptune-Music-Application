output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "frontend_ecr_repository_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "backend_ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "github_connection_arn" {
  value = local.github_connection_arn
}

output "codepipeline_name" {
  value = aws_codepipeline.app.name
}

output "cloudinary" {
  value = "External media storage: M4A music + cover images"
}
