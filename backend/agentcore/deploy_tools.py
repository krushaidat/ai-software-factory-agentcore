#!/usr/bin/env python3
"""
Deploy the 7 tool Lambdas + register them as AgentCore Gateway Targets.

For each tool under `backend/tools/<name>`:
  1. Build a zip with `app.py`, vendored deps from `requirements.txt`.
  2. Create/update the Lambda function (Python 3.12, arm64, 60s timeout).
  3. Register a GatewayTarget pointing at the Lambda with the tool_schema.json
     describing its inputs/outputs to MCP clients (the agents).

Lambdas deployed under naming `aisf-tool-<name>`. Existing ones are updated.

Usage:
    python backend/agentcore/deploy_tools.py
    python backend/agentcore/deploy_tools.py misra_checker  # just one
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "us-east-1")
PROJECT = "ai-software-factory"
ACCOUNT_ID = boto3.client("sts").get_caller_identity()["Account"]

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TOOLS_ROOT = REPO_ROOT / "backend" / "tools"
DEPLOY_OUTPUT = Path(__file__).parent / ".deploy-output.json"

# Reuse the AgentCore runtime role for the tool Lambdas — it has the AWS perms
# they need (DynamoDB CRUD via inline policy below + basic logs).
TOOL_ROLE_NAME = "ai-software-factory-tool-lambda-role"

TOOLS = [
    "misra_checker",
    "cve_lookup",
    "fleet_query",
    "jira_create",
    "dtc_register",
    "knowledge_graph_query",
    "coverage_query",
]

TOOL_TRUST_POLICY = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole",
    }],
}

TOOL_INLINE_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
            ],
            "Resource": "*",
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:DescribeTable",
            ],
            "Resource": "*",
        },
    ],
}


def banner(msg: str) -> None:
    print(f"\n{'=' * 70}\n{msg}\n{'=' * 70}")


def ensure_role() -> str:
    """Create or reuse the tool Lambda role, return its ARN."""
    iam = boto3.client("iam")
    try:
        arn = iam.get_role(RoleName=TOOL_ROLE_NAME)["Role"]["Arn"]
        print(f"  Role exists: {arn}")
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(
            RoleName=TOOL_ROLE_NAME,
            AssumeRolePolicyDocument=json.dumps(TOOL_TRUST_POLICY),
            Description=f"{PROJECT} - tool Lambda role",
        )["Role"]["Arn"]
        print(f"  Role created: {arn}")
    iam.put_role_policy(
        RoleName=TOOL_ROLE_NAME,
        PolicyName=f"{TOOL_ROLE_NAME}-policy",
        PolicyDocument=json.dumps(TOOL_INLINE_POLICY),
    )
    return arn


def build_zip(tool_name: str) -> bytes:
    """Build a Lambda zip for the given tool: bundles app.py + deps."""
    src = TOOLS_ROOT / tool_name
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)

        # Copy tool source
        for f in src.iterdir():
            if f.is_file() and f.suffix in (".py", ".json", ".txt"):
                shutil.copy(f, tmpdir / f.name)

        # Install deps from requirements.txt (skip if empty)
        req = src / "requirements.txt"
        if req.exists() and req.read_text().strip():
            print(f"  installing deps for {tool_name}...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--quiet",
                 "--target", str(tmpdir),
                 "--platform", "manylinux2014_aarch64",
                 "--only-binary=:all:",
                 "--implementation", "cp",
                 "--python-version", "3.12",
                 "-r", str(req)],
                check=True,
            )

        # Zip everything
        buf = tempfile.SpooledTemporaryFile(max_size=64 * 1024 * 1024)
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in tmpdir.rglob("*"):
                if path.is_file():
                    zf.write(path, path.relative_to(tmpdir))
        buf.seek(0)
        return buf.read()


def deploy_lambda(tool_name: str, role_arn: str, zip_bytes: bytes) -> str:
    """Create or update the Lambda function, return its ARN."""
    fn_name = f"aisf-tool-{tool_name.replace('_', '-')}"
    lam = boto3.client("lambda", region_name=REGION)

    try:
        existing = lam.get_function(FunctionName=fn_name)
        print(f"  updating Lambda {fn_name}...")
        lam.update_function_code(
            FunctionName=fn_name,
            ZipFile=zip_bytes,
        )
        # Wait for code update to finish before updating config
        for _ in range(30):
            cfg = lam.get_function_configuration(FunctionName=fn_name)
            if cfg.get("LastUpdateStatus") == "Successful":
                break
            time.sleep(2)
        lam.update_function_configuration(
            FunctionName=fn_name,
            Role=role_arn,
            Runtime="python3.12",
            Handler="app.handler",
            Timeout=60,
            MemorySize=256,
            Environment={"Variables": {"PROJECT_NAME": PROJECT}},
        )
        return existing["Configuration"]["FunctionArn"]
    except lam.exceptions.ResourceNotFoundException:
        pass

    print(f"  creating Lambda {fn_name}...")
    resp = lam.create_function(
        FunctionName=fn_name,
        Runtime="python3.12",
        Role=role_arn,
        Handler="app.handler",
        Code={"ZipFile": zip_bytes},
        Timeout=60,
        MemorySize=256,
        Architectures=["arm64"],
        Environment={"Variables": {"PROJECT_NAME": PROJECT}},
        Description=f"AI Software Factory tool: {tool_name}",
    )
    # Wait until the function is Active before returning, otherwise downstream
    # API calls (Gateway target registration) fail with a transient error.
    waiter = lam.get_waiter("function_active_v2")
    waiter.wait(FunctionName=fn_name, WaiterConfig={"Delay": 2, "MaxAttempts": 30})
    return resp["FunctionArn"]


def grant_gateway_invoke(fn_name: str, gateway_role_arn: str) -> None:
    """Allow the AgentCore Gateway role to invoke this Lambda."""
    lam = boto3.client("lambda", region_name=REGION)
    sid = "agentcore-gateway-invoke"
    try:
        lam.add_permission(
            FunctionName=fn_name,
            StatementId=sid,
            Action="lambda:InvokeFunction",
            Principal=gateway_role_arn,
        )
    except lam.exceptions.ResourceConflictException:
        pass  # Permission already exists


def register_target(gateway_id: str, tool_name: str, lambda_arn: str) -> dict[str, Any]:
    """Register the Lambda as a GatewayTarget. Idempotent — updates if exists."""
    schema_path = TOOLS_ROOT / tool_name / "tool_schema.json"
    schema = json.loads(schema_path.read_text())
    target_name = tool_name.replace("_", "-")[:48]

    ac = boto3.client("bedrock-agentcore-control", region_name=REGION)

    # Check if a target with this name already exists
    existing_targets = ac.list_gateway_targets(gatewayIdentifier=gateway_id, maxResults=100).get("items", [])
    existing = next((t for t in existing_targets if t.get("name") == target_name), None)

    target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": schema["tool_name"],
                            "description": schema["description"],
                            "inputSchema": _normalize_schema(schema["input_schema"]),
                            "outputSchema": _normalize_schema(schema["output_schema"]),
                        }
                    ]
                },
            }
        }
    }

    # AgentCore Gateway requires every tool target to have at least one
    # credential provider configured. For Lambda targets the gateway invokes
    # the Lambda using its own role, so GATEWAY_IAM_ROLE is the natural choice.
    cred_providers = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]

    if existing:
        print(f"  updating target {target_name} ({existing['targetId']})...")
        ac.update_gateway_target(
            gatewayIdentifier=gateway_id,
            targetId=existing["targetId"],
            name=target_name,
            description=schema["description"][:200],
            targetConfiguration=target_config,
            credentialProviderConfigurations=cred_providers,
        )
        return existing
    else:
        print(f"  creating target {target_name}...")
        return ac.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=target_name,
            description=schema["description"][:200],
            targetConfiguration=target_config,
            credentialProviderConfigurations=cred_providers,
        )


_GATEWAY_SCHEMA_KEYS = {"type", "properties", "required", "items", "description"}


def _normalize_schema(s: Any) -> Any:
    """AgentCore Gateway only accepts type/properties/required/items/description
    in tool schemas. Strip enum/minimum/maximum/pattern/etc. recursively."""
    if isinstance(s, dict):
        out: dict[str, Any] = {}
        for k, v in s.items():
            if k not in _GATEWAY_SCHEMA_KEYS:
                continue
            out[k] = _normalize_schema(v)
        return out
    if isinstance(s, list):
        return [_normalize_schema(x) for x in s]
    return s


def main() -> int:
    out = json.loads(DEPLOY_OUTPUT.read_text()) if DEPLOY_OUTPUT.exists() else {}
    gateway_id = out.get("gateway_id")
    if not gateway_id:
        print("ERROR: gateway_id missing from .deploy-output.json — run deploy_real.py first")
        return 1

    targets = sys.argv[1:] if len(sys.argv) > 1 else TOOLS

    banner("Stage A: tool Lambda role")
    role_arn = ensure_role()
    # IAM propagation
    time.sleep(8)

    out.setdefault("tools", {})
    for tool in targets:
        if tool not in TOOLS:
            print(f"  unknown tool: {tool}")
            continue
        banner(f"Tool: {tool}")
        zip_bytes = build_zip(tool)
        lambda_arn = deploy_lambda(tool, role_arn, zip_bytes)
        grant_gateway_invoke(f"aisf-tool-{tool.replace('_', '-')}", out["gateway_role_arn"])
        target = register_target(gateway_id, tool, lambda_arn)
        out["tools"][tool] = {
            "lambda_arn": lambda_arn,
            "target_id": target.get("targetId"),
        }

    DEPLOY_OUTPUT.write_text(json.dumps(out, indent=2, default=str))
    banner("Done")
    print(f"  Tools deployed: {list(out['tools'].keys())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
