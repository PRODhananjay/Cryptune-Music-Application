resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.project_name}/app"
  description             = "Cryptune JWT and Cloudinary credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    JWT_SECRET            = var.jwt_secret
    CLOUDINARY_CLOUD_NAME = var.cloudinary_cloud_name
    CLOUDINARY_API_KEY    = var.cloudinary_api_key
    CLOUDINARY_API_SECRET = var.cloudinary_api_secret
  })
}

# RDS creates a separate managed master-password secret.
# The ECS task execution role gets access to it so the backend can use it.
