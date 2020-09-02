output "slack_slash_command_api_gateway_url" {
  value = "${aws_api_gateway_deployment.slack_api_deployment.invoke_url}/${var.slack_api_gateway_resource_path}"
}
