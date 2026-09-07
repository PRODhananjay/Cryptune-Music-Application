variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "cryptune"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name."
  type        = string
}
