terraform {
  backend "s3" {
    bucket = "terraform.bwv21.io"
    key = "slack_slash_command_cat/terraform.state"
    region = "ap-northeast-2"
  }
}
