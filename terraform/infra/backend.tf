terraform {
  backend "s3" {
    bucket       = "REPLACE_WITH_STATE_BUCKET"
    key          = "cryptune/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
