#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${1:-ai-software-factory}"
REGION="${2:-us-east-1}"
DOMAIN="${3:-}"
HOSTED_ZONE="${4:-}"
CERT_ARN="${5:-}"

echo "Building..."
npm run build

echo "Deploying CloudFormation stack: $STACK_NAME"
PARAMS="ParameterKey=DomainName,ParameterValue=$DOMAIN ParameterKey=HostedZoneId,ParameterValue=$HOSTED_ZONE ParameterKey=CertificateArn,ParameterValue=$CERT_ARN"

aws cloudformation deploy \
  --template-file infra/template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --parameter-overrides $PARAMS \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Get outputs
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)
SITE_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" --output text)

echo "Syncing assets to S3..."
# Hashed assets - long cache
aws s3 sync dist/assets/ "s3://$BUCKET/assets/" \
  --cache-control "max-age=31536000,immutable" \
  --delete \
  --region "$REGION"

# index.html and other root files - no cache
aws s3 sync dist/ "s3://$BUCKET/" \
  --exclude "assets/*" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --delete \
  --region "$REGION"

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --region "$REGION"

echo ""
echo "Deployed! Site URL: https://$SITE_URL"
