#!/bin/sh
set -e

ENV_FILE_NAME=".env-cmdrc.json"

rm -f $ENV_FILE_NAME
aws secretsmanager get-secret-value --region us-west-2 --secret-id $AWS_SECRET_MANAGER_ARN --query SecretString --output text > $ENV_FILE_NAME

echo "Downloading patient data from: s3://$SAMPLE_FILE_BUCKET/patients.$ENVIRONMENT.json"

aws s3 cp "s3://$SAMPLE_FILE_BUCKET/patients.$ENVIRONMENT.json" "data/patients.$ENVIRONMENT.json"

exec "$@"
