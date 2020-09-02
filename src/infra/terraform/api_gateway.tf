resource "aws_api_gateway_account" "slack_api_account" {
  cloudwatch_role_arn = aws_iam_role.slack_api_role.arn
}

resource "aws_iam_role" "slack_api_role" {
  name = var.slack_api_gateway_role_name 

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "slack_api_role_policy" {
  name = "default"
  role = aws_iam_role.slack_api_role.id

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_api_gateway_rest_api" "slack_api" {
  name = var.slack_api_gateway_name
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "slack_api_resource" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  parent_id = aws_api_gateway_rest_api.slack_api.root_resource_id
  path_part = var.slack_api_gateway_resource_path
}

resource "aws_api_gateway_method" "slack_api_method" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  resource_id = aws_api_gateway_resource.slack_api_resource.id
  http_method = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method_settings" "slack_api_method_settings" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  stage_name  = aws_api_gateway_deployment.slack_api_deployment.stage_name
  method_path = "*/*"

  settings {
#    logging_level = "INFO"
#    data_trace_enabled = true
#    metrics_enabled = true
  }
}

resource "aws_api_gateway_integration" "slack_api_integration" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  resource_id = aws_api_gateway_resource.slack_api_resource.id
  http_method = aws_api_gateway_method.slack_api_method.http_method
  integration_http_method = "POST"
  type = "AWS"
  uri = aws_lambda_function.slack_slash_command_lambda.invoke_arn

  passthrough_behavior = "WHEN_NO_TEMPLATES"

  request_templates = {
    "application/x-www-form-urlencoded" = file("req_mapping_template")
  }
}

resource "aws_api_gateway_method_response" "response_200" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  resource_id = aws_api_gateway_resource.slack_api_resource.id
  http_method = aws_api_gateway_method.slack_api_method.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration_response" "slack_api_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  resource_id = aws_api_gateway_resource.slack_api_resource.id
  http_method = aws_api_gateway_method.slack_api_method.http_method
  status_code = aws_api_gateway_method_response.response_200.status_code

  response_templates = {
    "application/json" = <<EOF
#set($inputRoot = $input.path('$'))
EOF
  }
}

resource "aws_api_gateway_deployment" "slack_api_deployment" {
  depends_on = [aws_api_gateway_integration.slack_api_integration]
  rest_api_id = aws_api_gateway_rest_api.slack_api.id
  stage_name = var.slack_api_gateway_stage_name

  lifecycle {
    create_before_destroy = true
  }
}
