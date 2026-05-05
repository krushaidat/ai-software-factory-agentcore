#!/usr/bin/env python3
"""
Staged AgentCore deploy using boto3 (bypasses the broken CFN attempt).

This script provisions in stages so each step is independently verifiable:

  1. IAM roles (one for Runtime, one for Gateway) — idempotent
  2. AgentCore Memory store with 4 strategies — idempotent (skips if name exists)
  3. AgentCore Gateway (MCP, IAM-authorized) — idempotent
  4. AgentCore Runtimes (1 supervisor + 6 specialists) — idempotent

Outputs all ARNs to `backend/agentcore/.deploy-output.json`.

After this, separately update the main backend stack so the
`agentcore-bridge` Lambda has `SUPERVISOR_RUNTIME_ARN` set.

Usage:
    python backend/agentcore/deploy_real.py --stage all
    python backend/agentcore/deploy_real.py --stage memory
    python backend/agentcore/deploy_real.py --stage gateway
    python backend/agentcore/deploy_real.py --stage runtimes
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "us-east-1")
ACCOUNT_ID = boto3.client("sts").get_caller_identity()["Account"]

PROJECT = "ai-software-factory"
PROJECT_UNDERSCORE = "ai_software_factory"
MEMORY_NAME = f"{PROJECT_UNDERSCORE}_memory"  # alphanumeric+underscore only
GATEWAY_NAME = f"{PROJECT}-tools-gateway"
RUNTIME_ROLE_NAME = f"{PROJECT}-agentcore-runtime-role"
GATEWAY_ROLE_NAME = f"{PROJECT}-agentcore-gateway-role"

# Map of (agent dir name) -> (ECR repo name, runtime name).
# Runtime names must be alphanumeric + underscore (no hyphens).
AGENTS = [
    ("supervisor", "supervisor-agent", "ai_software_factory_supervisor"),
    ("quality_agent", "quality-agent", "ai_software_factory_quality"),
    ("safety_agent", "safety-agent", "ai_software_factory_safety"),
    ("security_agent", "security-agent", "ai_software_factory_security"),
    ("test_agent", "test-agent", "ai_software_factory_test"),
    ("deployment_agent", "deployment-agent", "ai_software_factory_deployment"),
    ("integration_agent", "integration-agent", "ai_software_factory_integration"),
]

OUTPUT_FILE = Path(__file__).parent / ".deploy-output.json"


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def load_output() -> dict[str, Any]:
    if OUTPUT_FILE.exists():
        return json.loads(OUTPUT_FILE.read_text())
    return {}


def save_output(data: dict[str, Any]) -> None:
    OUTPUT_FILE.write_text(json.dumps(data, indent=2, default=str))


def banner(msg: str) -> None:
    print(f"\n{'=' * 70}\n{msg}\n{'=' * 70}")


# ---------------------------------------------------------------------------
# Stage 1 — IAM roles
# ---------------------------------------------------------------------------

RUNTIME_TRUST_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"Service": "bedrock-agentcore.amazonaws.com"},
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {"aws:SourceAccount": ACCOUNT_ID},
            },
        }
    ],
}

RUNTIME_INLINE_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
            ],
            "Resource": "*",
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:DescribeLogStreams",
            ],
            "Resource": "*",
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetAuthorizationToken",
            ],
            "Resource": "*",
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock-agentcore:InvokeAgentRuntime",
                "bedrock-agentcore:GetWorkloadAccessToken",
                "bedrock-agentcore:RetrieveMemoryRecords",
                "bedrock-agentcore:CreateEvent",
                "bedrock-agentcore:ListMemoryRecords",
            ],
            "Resource": "*",
        },
        {
            "Effect": "Allow",
            "Action": ["events:PutEvents"],
            "Resource": "*",
        },
    ],
}


def ensure_role(name: str, trust: dict[str, Any], inline: dict[str, Any]) -> str:
    iam = boto3.client("iam")
    try:
        resp = iam.get_role(RoleName=name)
        arn = resp["Role"]["Arn"]
        print(f"  IAM role {name} already exists: {arn}")
    except iam.exceptions.NoSuchEntityException:
        resp = iam.create_role(
            RoleName=name,
            AssumeRolePolicyDocument=json.dumps(trust),
            Description=f"{PROJECT} - AgentCore role",
        )
        arn = resp["Role"]["Arn"]
        print(f"  Created IAM role {name}: {arn}")

    iam.put_role_policy(
        RoleName=name,
        PolicyName=f"{name}-policy",
        PolicyDocument=json.dumps(inline),
    )
    print(f"  Attached inline policy to {name}")
    return arn


def stage_iam(out: dict[str, Any]) -> dict[str, Any]:
    banner("Stage 1: IAM roles")
    out["runtime_role_arn"] = ensure_role(RUNTIME_ROLE_NAME, RUNTIME_TRUST_POLICY, RUNTIME_INLINE_POLICY)
    out["gateway_role_arn"] = ensure_role(GATEWAY_ROLE_NAME, RUNTIME_TRUST_POLICY, RUNTIME_INLINE_POLICY)
    save_output(out)
    return out


# ---------------------------------------------------------------------------
# Stage 2 — Memory store
# ---------------------------------------------------------------------------

def stage_memory(out: dict[str, Any]) -> dict[str, Any]:
    banner("Stage 2: AgentCore Memory store")
    client = boto3.client("bedrock-agentcore-control", region_name=REGION)

    # Idempotency: check if a memory with our name already exists.
    existing = client.list_memories(maxResults=100).get("memories", [])
    for m in existing:
        if m.get("name") == MEMORY_NAME or m.get("id", "").startswith(f"{MEMORY_NAME}-"):
            print(f"  Memory {MEMORY_NAME} already exists: {m['id']}")
            out["memory_id"] = m["id"]
            out["memory_arn"] = m.get("arn") or f"arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT_ID}:memory/{m['id']}"
            save_output(out)
            return out

    print(f"  Creating memory {MEMORY_NAME}...")
    resp = client.create_memory(
        name=MEMORY_NAME,
        description="Cross-session memory for AI Software Factory agents",
        eventExpiryDuration=90,  # days
        memoryStrategies=[
            {"semanticMemoryStrategy": {
                "name": "semantic_defects",
                "description": "Defect patterns and code smells learned from past PRs",
            }},
            {"summaryMemoryStrategy": {
                "name": "pr_summaries",
                "description": "One-line summaries of past PR analyses",
            }},
            {"userPreferenceMemoryStrategy": {
                "name": "user_preferences",
                "description": "Per-user preferences (verbosity, format, expertise level)",
            }},
        ],
    )
    mem = resp["memory"]
    print(f"  Created: {mem['id']}")
    out["memory_id"] = mem["id"]
    out["memory_arn"] = mem.get("arn") or f"arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT_ID}:memory/{mem['id']}"
    save_output(out)
    return out


# ---------------------------------------------------------------------------
# Stage 3 — Gateway (just the gateway, no targets yet — we can add tools later)
# ---------------------------------------------------------------------------

def stage_gateway(out: dict[str, Any]) -> dict[str, Any]:
    banner("Stage 3: AgentCore Gateway")
    if "gateway_role_arn" not in out:
        raise RuntimeError("Need gateway_role_arn from stage_iam")

    client = boto3.client("bedrock-agentcore-control", region_name=REGION)

    existing = client.list_gateways(maxResults=100).get("items", [])
    for g in existing:
        if g.get("name") == GATEWAY_NAME:
            print(f"  Gateway {GATEWAY_NAME} already exists: {g['gatewayId']}")
            out["gateway_id"] = g["gatewayId"]
            out["gateway_url"] = f"https://{g['gatewayId']}.gateway.bedrock-agentcore.{REGION}.amazonaws.com/mcp"
            save_output(out)
            return out

    print(f"  Creating gateway {GATEWAY_NAME}...")
    resp = client.create_gateway(
        name=GATEWAY_NAME,
        description="MCP gateway exposing 7 tool Lambdas to the AI Software Factory agent swarm",
        roleArn=out["gateway_role_arn"],
        protocolType="MCP",
        authorizerType="CUSTOM_JWT",  # required by the API even if we don't use it
        authorizerConfiguration={
            "customJWTAuthorizer": {
                "discoveryUrl": f"https://cognito-idp.{REGION}.amazonaws.com/us-east-1_PtOilWiTe/.well-known/openid-configuration",
                "allowedClients": ["4ceo355uah5jb2a3a11n8kg695"],
            }
        },
        protocolConfiguration={
            "mcp": {
                "instructions": (
                    "You have access to automotive software analysis tools: misra_checker (MISRA C/C++ static analysis), "
                    "cve_lookup (NVD CVE matching), fleet_query (test environment availability), "
                    "jira_create, dtc_register, knowledge_graph_query, coverage_query. "
                    "Always cite tool results in findings — do not invent data."
                ),
            }
        },
    )
    g = resp.get("gateway") or resp
    gw_id = g.get("gatewayId") or g.get("id")
    print(f"  Created: {gw_id}")
    out["gateway_id"] = gw_id
    out["gateway_url"] = g.get("gatewayUrl") or f"https://{gw_id}.gateway.bedrock-agentcore.{REGION}.amazonaws.com/mcp"
    save_output(out)
    return out


# ---------------------------------------------------------------------------
# Stage 4 — Runtimes (one per agent)
# ---------------------------------------------------------------------------

def stage_runtimes(out: dict[str, Any], only_supervisor: bool = False) -> dict[str, Any]:
    banner(f"Stage 4: AgentCore Runtimes ({'supervisor only' if only_supervisor else 'all 7'})")
    if "runtime_role_arn" not in out:
        raise RuntimeError("Need runtime_role_arn from stage_iam")

    client = boto3.client("bedrock-agentcore-control", region_name=REGION)
    runtimes = out.get("runtimes", {})

    existing = client.list_agent_runtimes(maxResults=100).get("agentRuntimes", [])
    existing_by_name = {r["agentRuntimeName"]: r for r in existing}

    targets = AGENTS[:1] if only_supervisor else AGENTS
    # AgentCore Runtime requires arm64. agent-v1 uses bedrock-agentcore SDK
    # entrypoint and absolute imports.
    image_tag = os.environ.get("AGENT_IMAGE_TAG", "agent-v1")
    for agent_dir, ecr_repo, runtime_name in targets:
        image_uri = f"{ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}/{ecr_repo}:{image_tag}"

        # Sibling runtime ARNs (so the supervisor can find them).
        # The supervisor agent code looks up env vars by AGENT_DIR.upper() —
        # e.g. "quality_agent" -> "QUALITY_AGENT_RUNTIME_ARN" — so we publish
        # env vars under the agent_dir name, not the runtime_name.
        sibling_arns: dict[str, str] = {}
        for sib_dir, _, sib_runtime in AGENTS:
            if sib_runtime in existing_by_name:
                sibling_arns[f"{sib_dir.upper()}_RUNTIME_ARN"] = existing_by_name[sib_runtime]["agentRuntimeArn"]

        env_vars = {
            "BEDROCK_MODEL_ID": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
            "PROJECT_NAME": PROJECT,
            "MEMORY_ID": out.get("memory_id", ""),
            "GATEWAY_URL": out.get("gateway_url", ""),
            "EVENT_BUS_NAME": "default",
            **sibling_arns,
        }

        if runtime_name in existing_by_name:
            existing_rt = existing_by_name[runtime_name]
            print(f"  {runtime_name}: already exists, updating image to {image_uri}...")
            try:
                resp = client.update_agent_runtime(
                    agentRuntimeId=existing_rt["agentRuntimeId"],
                    agentRuntimeArtifact={"containerConfiguration": {"containerUri": image_uri}},
                    networkConfiguration={"networkMode": "PUBLIC"},
                    roleArn=out["runtime_role_arn"],
                    environmentVariables=env_vars,
                )
                rt = resp.get("agentRuntime") or resp
            except ClientError as e:
                print(f"    update_agent_runtime failed: {e.response['Error']['Code']} — {e.response['Error']['Message']}")
                runtimes[runtime_name] = {
                    "id": existing_rt["agentRuntimeId"],
                    "arn": existing_rt["agentRuntimeArn"],
                    "status": existing_rt["status"],
                }
                continue
        else:
            print(f"  Creating runtime {runtime_name} (image: {image_uri})...")
            try:
                resp = client.create_agent_runtime(
                    agentRuntimeName=runtime_name,
                    description=f"AI Software Factory — {agent_dir} agent (Strands SDK + Sonnet 4.5)",
                    agentRuntimeArtifact={"containerConfiguration": {"containerUri": image_uri}},
                    roleArn=out["runtime_role_arn"],
                    networkConfiguration={"networkMode": "PUBLIC"},
                    environmentVariables=env_vars,
                )
                rt = resp.get("agentRuntime") or resp
            except ClientError as e:
                print(f"    FAIL: {e.response['Error']['Code']} — {e.response['Error']['Message']}")
                continue

        rt_id = rt.get("agentRuntimeId")
        rt_arn = rt.get("agentRuntimeArn") or f"arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT_ID}:runtime/{rt_id}"
        print(f"    -> {rt_id}")
        runtimes[runtime_name] = {
            "id": rt_id,
            "arn": rt_arn,
            "status": rt.get("status", "CREATING"),
            "image": image_uri,
        }

    out["runtimes"] = runtimes
    out["supervisor_runtime_arn"] = runtimes.get("ai_software_factory_supervisor", {}).get("arn")
    save_output(out)
    return out


# ---------------------------------------------------------------------------
# Smoke tests
# ---------------------------------------------------------------------------

def smoke_test_runtime(out: dict[str, Any]) -> None:
    banner("Smoke test: invoke supervisor runtime")
    arn = out.get("supervisor_runtime_arn")
    if not arn:
        print("  No supervisor runtime ARN found")
        return
    # Full optB pipeline takes ~3-5 min (supervisor + 6 specialists, each with
    # multiple Bedrock calls), so the default 60s read timeout is way too short.
    from botocore.config import Config
    cfg = Config(read_timeout=600, connect_timeout=10, retries={"max_attempts": 0})
    client = boto3.client("bedrock-agentcore", region_name=REGION, config=cfg)
    # AgentCore requires runtimeSessionId be >=33 chars
    sid = f"smoke-test-session-{int(time.time())}-padding-extra"
    payload = json.dumps({
        "fileContent": "// trivial test\nint main(void) { return 0; }",
        "fileId": "smoke-test.c",
        "mode": "base",
        "sessionId": sid,
        "runId": f"smoke-{int(time.time())}",
    }).encode()
    try:
        resp = client.invoke_agent_runtime(
            agentRuntimeArn=arn,
            qualifier="DEFAULT",
            runtimeSessionId=sid,
            payload=payload,
        )
        body = resp["response"].read()
        print(f"  invoke OK ({len(body)} bytes returned)")
        print(f"  preview: {body[:300]!r}")
    except ClientError as e:
        print(f"  FAIL: {e.response['Error']['Code']} — {e.response['Error']['Message']}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage",
        default="all",
        choices=["iam", "memory", "gateway", "supervisor", "runtimes", "smoke", "all"],
    )
    args = parser.parse_args()

    out = load_output()

    if args.stage in ("iam", "all"):
        stage_iam(out)
    if args.stage in ("memory", "all"):
        stage_memory(out)
    if args.stage in ("gateway", "all"):
        stage_gateway(out)
    if args.stage == "supervisor":
        stage_runtimes(out, only_supervisor=True)
    if args.stage in ("runtimes", "all"):
        stage_runtimes(out, only_supervisor=False)
    if args.stage == "smoke":
        smoke_test_runtime(out)

    banner("Output")
    print(json.dumps(out, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
