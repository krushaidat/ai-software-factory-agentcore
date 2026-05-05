"""Repackage + update the agentcore-bridge Lambda directly via boto3 (skipping SAM)."""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

import boto3

REGION = "us-east-1"
FN_NAME = "ai-software-factory-agentcore-bridge-prod"

REPO = Path(__file__).resolve().parent.parent.parent
src = REPO / "backend" / "functions" / "agentcore-bridge"
layer = REPO / "backend" / "layers" / "common" / "python"

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in src.iterdir():
        if f.is_file() and f.suffix == ".py":
            zf.write(f, f.name)
    # Include the shared layer code as a regular module under the function root.
    for f in (layer / "utils").rglob("*.py"):
        rel = f.relative_to(layer)
        zf.write(f, str(rel).replace("\\", "/"))

buf.seek(0)
data = buf.read()
print(f"zip size: {len(data)} bytes")

lam = boto3.client("lambda", region_name=REGION)
resp = lam.update_function_code(FunctionName=FN_NAME, ZipFile=data)
print(f"LastModified: {resp['LastModified']}  Version: {resp['Version']}")
