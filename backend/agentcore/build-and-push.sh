#!/usr/bin/env bash
# Build and push AgentCore Runtime container images for all 7 agents.
#
# Run from the repo root:
#   bash backend/agentcore/build-and-push.sh
#
# Outputs a "key=value" block on stdout that you can paste into the
# `--parameter-overrides` flag of `aws cloudformation deploy`. deploy.sh
# captures and forwards these automatically.
#
# Notes:
#   - Repos are created by backend/agentcore/template.yaml. This script
#     assumes they already exist; if not, deploy the stack once with
#     placeholder image URIs, then re-run this and re-deploy.
#   - Images are tagged with both `latest` and the current git SHA so
#     that runtime resources can be pinned for reproducibility.
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
PROJECT="${PROJECT_NAME:-ai-software-factory}"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo manual)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Resolve the repo root from the script location so the script works
# regardless of cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo ">> Logging into ECR (${REGISTRY})..."
aws ecr get-login-password --region "${REGION}" \
    | docker login --username AWS --password-stdin "${REGISTRY}"

# Map of ParameterName -> "<agent_dir>:<ecr_repo_name>"
# - agent_dir is the snake_case directory under backend/agents/
# - ecr_repo_name is the kebab-case name used in template.yaml (matches
#   the AWS::ECR::Repository RepositoryName property).
declare -A AGENTS=(
  [SupervisorImageUri]="supervisor:supervisor-agent"
  [QualityAgentImageUri]="quality_agent:quality-agent"
  [SafetyAgentImageUri]="safety_agent:safety-agent"
  [SecurityAgentImageUri]="security_agent:security-agent"
  [TestAgentImageUri]="test_agent:test-agent"
  [DeploymentAgentImageUri]="deployment_agent:deployment-agent"
  [IntegrationAgentImageUri]="integration_agent:integration-agent"
)

OVERRIDES=()

for PARAM in "${!AGENTS[@]}"; do
  IFS=':' read -r AGENT_DIR ECR_NAME <<< "${AGENTS[$PARAM]}"
  REPO="${REGISTRY}/${PROJECT}/${ECR_NAME}"
  CTX="${REPO_ROOT}/backend/agents/${AGENT_DIR}"

  if [[ ! -f "${CTX}/Dockerfile" ]]; then
    echo "!! Skipping ${AGENT_DIR} — no Dockerfile at ${CTX}" >&2
    continue
  fi

  echo ">> Building ${AGENT_DIR} -> ${REPO}:${GIT_SHA}"
  docker buildx build \
      --platform linux/arm64 \
      --provenance=false \
      -t "${REPO}:latest" \
      -t "${REPO}:${GIT_SHA}" \
      "${CTX}"

  echo ">> Pushing ${REPO}:${GIT_SHA} (and :latest)"
  docker push "${REPO}:${GIT_SHA}"
  docker push "${REPO}:latest"

  OVERRIDES+=("${PARAM}=${REPO}:${GIT_SHA}")
done

echo
echo "================ CFN parameter overrides ================"
printf '%s\n' "${OVERRIDES[@]}"
echo "========================================================="
# Also write them out to a file so deploy.sh can source them.
printf '%s\n' "${OVERRIDES[@]}" > "${SCRIPT_DIR}/.image-overrides"
echo "Wrote overrides to ${SCRIPT_DIR}/.image-overrides"
