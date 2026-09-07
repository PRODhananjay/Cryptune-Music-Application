variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "cryptune"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Exactly two AZs."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]

  validation {
    condition     = length(var.availability_zones) == 2
    error_message = "Provide exactly two Availability Zones."
  }
}

variable "frontend_image_tag" {
  type    = string
  default = "latest"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "frontend_container_port" {
  type    = number
  default = 80
}

variable "backend_container_port" {
  type    = number
  default = 4000
}

variable "ecs_cpu" {
  type    = number
  default = 1024
}

variable "ecs_memory" {
  type    = number
  default = 2048
}

variable "ecs_desired_count" {
  type    = number
  default = 2
}

variable "ecs_min_capacity" {
  type    = number
  default = 2
}

variable "ecs_max_capacity" {
  type    = number
  default = 4
}

variable "db_name" {
  type    = string
  default = "cryptune"
}

variable "db_username" {
  type    = string
  default = "cryptune_admin"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_multi_az" {
  type    = bool
  default = true
}

variable "github_owner" {
  type    = string
  default = "YOUR_GITHUB_OWNER"
}

variable "github_repo" {
  type    = string
  default = "cryptune"
}

variable "github_branch" {
  type    = string
  default = "main"
}

variable "github_connection_arn" {
  description = "Optional existing CodeConnections ARN. Leave empty to create one with Terraform."
  type        = string
  default     = ""
}

variable "cloudinary_cloud_name" {
  type      = string
  sensitive = true
}

variable "cloudinary_api_key" {
  type      = string
  sensitive = true
}

variable "cloudinary_api_secret" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "acm_certificate_arn" {
  description = "Optional ACM certificate ARN. If set, HTTPS :443 is created."
  type        = string
  default     = ""
}
