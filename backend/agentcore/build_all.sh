#!/usr/bin/env bash
# Build + push arm64 images for all 7 agents.
#
# Tag scheme: <ECR_REPO>:agent-v<N> where N is bumped each iteration.
# `deploy_real.py` reads AGENT_IMAGE_TAG to choose which tag to deploy.
#
# Usage:
#   bash backend/agentcore/build_all.sh           # builds all 7
#   bash backend/agentcore/build_all.sh quality   # builds just the named one(s)
#
set -e

ACCOUNT=966285262832
REGION=us-east-1
TAG=${AGENT_IMAGE_TAG:-agent-v1}

echo "=== Logging into ECR ==="
aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# Map directory name -> ECR repository name
declare -A REPOS=(
  [supervisor]=supervisor-agent
  [quality_agent]=quality-agent
  [safety_agent]=safety-agent
  [security_agent]=security-agent
  [test_agent]=test-agent
  [deployment_agent]=deployment-agent
  [integration_agent]=integration-agent
)

# If args provided, filter to those agents
TARGETS=("${@:-supervisor quality_agent safety_agent security_agent test_agent deployment_agent integration_agent}")
if [ $# -eq 0 ]; then
  TARGETS=(supervisor quality_agent safety_agent security_agent test_agent deployment_agent integration_agent)
fi

for AGENT in "${TARGETS[@]}"; do
  REPO=${REPOS[$AGENT]}
  if [ -z "$REPO" ]; then
    echo "  SKIP (unknown agent): $AGENT"
    continue
  fi
  IMAGE="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ai-software-factory/$REPO:$TAG"
  echo ""
  echo "=== Building $AGENT -> $IMAGE ==="
  docker buildx build \
    --platform linux/arm64 \
    --provenance=false \
    --push \
    -t "$IMAGE" \
    "backend/agents/$AGENT/"
done

echo ""
echo "=== Done. All images pushed with tag: $TAG ==="
