rm -f ./slack_slash_command_webpage_capture.zip
zip -y -r ./slack_slash_command_webpage_capture.zip ./*
aws lambda update-function-code --function-name bwv21_slack_slash_command_webpage_capture --zip-file fileb://slack_slash_command_webpage_capture.zip
aws s3 cp ./slack_slash_command_webpage_capture.zip s3://bwv21.slack.command/src/slack_slash_command_webpage_capture.zip
