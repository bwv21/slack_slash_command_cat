data "aws_caller_identity" "current" {}

resource "aws_iam_role" "slack_slash_command_lambda_role" {
  name = var.slack_slash_command_lambda_role_name
assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_cloudwatch_log_group" "slack_slash_command_lambda_log_group" {
  name = "/aws/lambda/${aws_lambda_function.slack_slash_command_lambda.function_name}"
  retention_in_days = 14
}

resource "aws_iam_policy" "slack_slash_command_lambda_policy" {
  name = var.slack_slash_command_lambda_policy_name
  path = "/"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    },
	{
      "Action": [
        "lambda:InvokeFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:ap-northeast-2:${data.aws_caller_identity.current.account_id}:function:${var.webpage_capture_lambda_name}",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "slack_slash_command_lambda_attach" {
  role = aws_iam_role.slack_slash_command_lambda_role.name
  policy_arn = aws_iam_policy.slack_slash_command_lambda_policy.arn
}

resource "aws_lambda_function" "slack_slash_command_lambda" {
  filename = var.slack_slash_command_lambda_file_name
  function_name = var.slack_slash_command_lambda_name
  role = aws_iam_role.slack_slash_command_lambda_role.arn
  handler = var.slack_slash_command_lambda_handler_name

  source_code_hash = filebase64sha256(var.slack_slash_command_lambda_file_name)

  runtime = var.slack_slash_command_lambda_runtime
  
  memory_size = var.slack_slash_command_lambda_memory_size
  timeout = var.slack_slash_command_lambda_timeout

  environment {
    variables = var.slack_slash_command_lambda_env_var
  } 
}

resource "aws_lambda_permission" "slack_api_lambda_permission" {
  statement_id = "AllowExecutionFromAPIGateway"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_slash_command_lambda.function_name
  principal = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${var.region}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.slack_api.id}/*/${aws_api_gateway_method.slack_api_method.http_method}${aws_api_gateway_resource.slack_api_resource.path}"
}

