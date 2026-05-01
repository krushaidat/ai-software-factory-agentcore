#!/usr/bin/env python3
"""Seed DynamoDB tables for the AI Software Factory AgentCore stack.

Reads `fleet.json` and `knowledge_graph.json` from the script directory and
batch-writes the items into the DynamoDB tables created by
backend/agentcore/template.yaml.

Usage:
    python seed.py \\
        --fleet-table       ai-software-factory-fleet-prod \\
        --kg-table          ai-software-factory-knowledge-graph-prod \\
        --jira-table        ai-software-factory-jira-prod \\
        --region            us-east-1

If `--*-table` arguments are omitted, the script falls back to looking up the
exports of the AgentCore CFN stack (default name: `ai-software-factory-agentcore`).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import boto3


HERE = Path(__file__).resolve().parent

# Mock Jira tickets — small inline corpus, not large enough to warrant its own
# JSON file. Aligns with the defect clusters in knowledge_graph.json.
JIRA_TICKETS: list[dict[str, Any]] = [
    {
        "ticket_key": "ECU-1042",
        "summary": "CAN_TimeoutHandler missing deadline budget on PDU 0x4A2",
        "status": "Open",
        "severity": "critical",
        "component": "CAN_TimeoutHandler",
        "asil": "B",
        "assignee": "platform-validation",
        "created": "2026-04-12T09:14:00Z",
    },
    {
        "ticket_key": "ECU-1057",
        "summary": "Null pointer dereference in TxConfirmation callback",
        "status": "In Progress",
        "severity": "critical",
        "component": "Com_TxConfirmation",
        "asil": "D",
        "assignee": "safety-engineering",
        "created": "2026-04-15T11:02:00Z",
    },
    {
        "ticket_key": "ECU-1063",
        "summary": "ASPICE traceability gap between SWE.3 and SWE.5 for brake stack",
        "status": "Open",
        "severity": "major",
        "component": "Brake_SWC",
        "asil": "B",
        "assignee": "process-quality",
        "created": "2026-04-18T08:30:00Z",
    },
    {
        "ticket_key": "ECU-1071",
        "summary": "CVE-2024-12345 advisory — review CAN ISR for DLC > 8 handling",
        "status": "Open",
        "severity": "critical",
        "component": "CanIf_RxIndication",
        "asil": "D",
        "assignee": "security-engineering",
        "created": "2026-04-22T13:55:00Z",
    },
]


def _batch_write(table, items: list[dict[str, Any]]) -> int:
    """Batch-write items into a DynamoDB table, 25 at a time."""
    written = 0
    with table.batch_writer() as bw:
        for item in items:
            bw.put_item(Item=item)
            written += 1
    return written


def _resolve_from_stack(stack_name: str, region: str) -> dict[str, str]:
    """Look up CFN outputs by export name suffix."""
    cfn = boto3.client("cloudformation", region_name=region)
    resp = cfn.describe_stacks(StackName=stack_name)
    outputs = {o["OutputKey"]: o["OutputValue"] for o in resp["Stacks"][0]["Outputs"]}
    return {
        "fleet": outputs.get("FleetTableName", ""),
        "kg": outputs.get("KnowledgeGraphTableName", ""),
        "jira": outputs.get("JiraTableName", ""),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fleet-table")
    parser.add_argument("--kg-table")
    parser.add_argument("--jira-table")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--stack-name", default="ai-software-factory-agentcore",
                        help="Used to resolve table names if --*-table flags omitted.")
    args = parser.parse_args()

    if not (args.fleet_table and args.kg_table and args.jira_table):
        resolved = _resolve_from_stack(args.stack_name, args.region)
        args.fleet_table = args.fleet_table or resolved["fleet"]
        args.kg_table = args.kg_table or resolved["kg"]
        args.jira_table = args.jira_table or resolved["jira"]

    if not all([args.fleet_table, args.kg_table, args.jira_table]):
        print("ERROR: could not resolve all table names. Pass --fleet-table, "
              "--kg-table, --jira-table or check that the stack outputs exist.",
              file=sys.stderr)
        return 2

    ddb = boto3.resource("dynamodb", region_name=args.region)

    fleet = json.loads((HERE / "fleet.json").read_text(encoding="utf-8"))
    kg = json.loads((HERE / "knowledge_graph.json").read_text(encoding="utf-8"))

    print(f"Seeding {args.fleet_table} with {len(fleet)} fleet items...")
    n = _batch_write(ddb.Table(args.fleet_table), fleet)
    print(f"  -> wrote {n} items.")

    print(f"Seeding {args.kg_table} with {len(kg)} knowledge-graph nodes...")
    n = _batch_write(ddb.Table(args.kg_table), kg)
    print(f"  -> wrote {n} items.")

    print(f"Seeding {args.jira_table} with {len(JIRA_TICKETS)} Jira tickets...")
    n = _batch_write(ddb.Table(args.jira_table), JIRA_TICKETS)
    print(f"  -> wrote {n} items.")

    print("Seed complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
