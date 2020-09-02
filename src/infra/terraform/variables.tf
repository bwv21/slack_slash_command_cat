variable "region" {
  default = "ap-northeast-2"
}

variable "profile" {
  default = "default"
}

variable "slack_api_gateway_name" {
  default = "slack-api"
}

variable "slack_api_gateway_resource_path" {
  default = "slash-command"
}

variable "slack_api_gateway_role_name" {
  default = "slack_api_gateway_role"
}

variable "slack_api_gateway_stage_name" {
  default = "dev"
}

variable "slack_slash_command_upload_s3_bucket" {
  default = "slash.slack.bwv21.io"
}

variable "slack_slash_command_lambda_role_name" {
  default = "slack_slash_command_lambda_role"
}

variable "slack_slash_command_lambda_policy_name" {
  default = "slack_slash_lambda_policy"
}

variable "slack_slash_command_lambda_file_name" {
  default = "slack_slash_command_lambda.zip"
}

variable "slack_slash_command_lambda_name" {
  default = "slack_slash_command_lambda"
}

variable "slack_slash_command_lambda_handler_name" {
  default = "index.handler"
}

variable "slack_slash_command_lambda_runtime" {
  default = "nodejs10.x"
}

variable "slack_slash_command_lambda_memory_size" {
  default = "128"
}

variable "slack_slash_command_lambda_timeout" {
  default = "30"
}

variable "slack_slash_command_lambda_env_var" {
  default = {}
}

variable "webpage_capture_lambda_role_name" {
  default = "webpage_capture_lambda_role"
}

variable "webpage_capture_lambda_policy_name" {
  default = "webpage_capture_lambda_policy"
}

variable "webpage_capture_lambda_file_name" {
  default = "webpage_capture_lambda.zip"
}

variable "webpage_capture_lambda_name" {
  default = "webpage_capture_lambda"
}

variable "webpage_capture_lambda_handler_name" {
  default = "index.handler"
}

variable "webpage_capture_lambda_runtime" {
  default = "nodejs10.x"
}

variable "webpage_capture_lambda_memory_size" {
  default = "1024"
}

variable "webpage_capture_lambda_timeout" {
  default = "30"
}

variable "webpage_capture_lambda_env_var" {
  default = {}
}
