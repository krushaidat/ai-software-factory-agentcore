#!/usr/bin/env bash
# Master deploy script for the AgentCore stack.
#
# Steps:
#   1. (Optional) build & push the 7 agent containers via build-and-push.sh.
#      Skip with SKIP_BUILD=1 if images are already in ECR.
#   2. Package + deploy backend/agentcore/template.yaml as the
#      "ai-software-factory-agentcore" CFN stack, importing values from
#      the main "ai-software-factory-backend" stack.
#   3. Run seed-data/seed.py to populate the four DynamoDB tables.
#   4. Print final outputs.
#
# Usage:
#     bash backend/agentcore/deploy.sh
#
# Env overrides:
#     AWS_REGION              (default us-east-1)
#     AGENTCORE_STACK_NAME    (default ai-software-factory-agentcore)
#     MAIN_STACK_NAME         (default ai-software-factory-backend)
#     SKIP_BUILD=1            skip docker build/push step
#     SKIP_SEED=1             skip the DynamoDB seed step
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${AGENTCORE_STACK_NAME:-ai-software-factory-agentcore}"
MAIN_STACK_NAME="${MAIN_STACK_NAME:-ai-software-factory-backend}"
PROJECT="${PROJECT_NAME:-ai-software-factory}"
S3_BUCKET="${SAM_S3_BUCKET:-${PROJECT}-sam-${REGION}-$(aws sts get-caller-identity --query Account --output text)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "============================================================"
echo "  AI Software Factory — AgentCore deploy"
echo "  region    : ${REGION}"
echo "  stack     : ${STACK_NAME}"
echo "  main stack: ${MAIN_STACK_NAME}"
echo "============================================================"

# ----------------------------------------------------------------------
# 1. Build & push containers
# ----------------------------------------------------------------------
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
    echo
    echo ">> Step 1/4: Building & pushing agent images"
    bash "${SCRIPT_DIR}/build-and-push.sh"
else
    echo ">> Step 1/4: skipped (SKIP_BUILD=1)"
fi

# Read the parameter overrides written by build-and-push.sh; if the
# file is missing we fall back to the placeholder defaults baked into
# template.yaml (which produces a deployable but non-functional stack —
# good for first-deploy ECR creation).
OVERRIDES=()
if [[ -f "${SCRIPT_DIR}/.image-overrides" ]]; then
    while IFS= read -r line; do
        OVERRIDES+=("${line}")
    done < "${SCRIPT_DIR}/.image-overrides"
fi
OVERRIDES+=("MainStackName=${MAIN_STACK_NAME}")

# ----------------------------------------------------------------------
# 2. Ensure SAM artefact bucket exists, then `sam deploy`
# ----------------------------------------------------------------------
echo
echo ">> Step 2/4: Deploying CloudFormation stack ${STACK_NAME}"

if ! aws s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null; then
    echo "Creating SAM artefact bucket ${S3_BUCKET}"
    aws s3 mb "s3://${S3_BUCKET}" --region "${REGION}"
fi

sam deploy \
    --template-file "${SCRIPT_DIR}/template.yaml" \
    --stack-name "${STACK_NAME}" \
    --s3-bucket "${S3_BUCKET}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "${REGION}" \
    --no-fail-on-empty-changeset \
    --parameter-overrides "${OVERRIDES[@]}"

# ----------------------------------------------------------------------
# 3. Seed DynamoDB
# ----------------------------------------------------------------------
if [[ "${SKIP_SEED:-0}" != "1" ]]; then
    echo
    echo ">> Step 3/4: Seeding DynamoDB tables"
    python "${SCRIPT_DIR}/seed-data/seed.py" \
        --region "${REGION}" \
        --stack-name "${STACK_NAME}"
else
    echo ">> Step 3/4: skipped (SKIP_SEED=1)"
fi

# ----------------------------------------------------------------------
# 4. Print outputs
# ----------------------------------------------------------------------
echo
echo ">> Step 4/4: Stack outputs"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs' \
    --output table

echo
echo "Deploy complete."
