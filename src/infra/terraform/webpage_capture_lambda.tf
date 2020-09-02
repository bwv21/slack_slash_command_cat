resource "aws_iam_role" "webpage_capture_lambda_role" {
  name = var.webpage_capture_lambda_role_name
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

resource "aws_cloudwatch_log_group" "webpage_capture_lambda_log_group" {
  name = "/aws/lambda/${aws_lambda_function.webpage_capture_lambda.function_name}"
  retention_in_days = 14
}

resource "aws_iam_policy" "webpage_capture_lambda_policy" {
  name = var.webpage_capture_lambda_policy_name
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
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::${var.slack_slash_command_upload_s3_bucket}/*",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "webpage_capture_lambda_attach" {
  role = aws_iam_role.webpage_capture_lambda_role.name
  policy_arn = aws_iam_policy.webpage_capture_lambda_policy.arn
}

resource "aws_lambda_function" "webpage_capture_lambda" {
  filename = var.webpage_capture_lambda_file_name
  function_name = var.webpage_capture_lambda_name
  role = aws_iam_role.webpage_capture_lambda_role.arn
  handler = var.webpage_capture_lambda_handler_name

  source_code_hash = filebase64sha256(var.webpage_capture_lambda_file_name)

  runtime = var.webpage_capture_lambda_runtime

  memory_size = var.webpage_capture_lambda_memory_size
  timeout = var.webpage_capture_lambda_timeout

  environment {
    variables = var.webpage_capture_lambda_env_var
  } 
}

