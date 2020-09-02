resource "aws_s3_bucket" "UploadS3Bucket" {
  bucket = var.slack_slash_command_upload_s3_bucket
  policy = <<POLICY
{
    "Id": "Policy1598598901629",
    "Version": "2012-10-17",
    "Statement": [
    {
      "Sid": "Stmt1598598478297",
      "Action": [
        "s3:GetObject"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${var.slack_slash_command_upload_s3_bucket}/*",
      "Principal": "*"
    }]
  }
  POLICY
}
