import json
import os
import uuid
import time
import traceback
import boto3
from utils.dynamodb import create_pipeline_run, check_pipeline_rate_limit
from utils.websocket import send_to_connection
from utils.response import ws_ok

sfn_client = boto3.client('stepfunctions')

def handler(event, context):
    connection_id = event['connectionId']
    body = event['body']
    session_id = body.get('sessionId', '')
    code = body.get('code', '')
    mode = body.get('mode', 'base')

    print(f"Pipeline start: sessionId={session_id}, mode={mode}, code_len={len(code)}")

    # Validate
    if not code or len(code) < 10:
        send_to_connection(connection_id, {
            'action': 'error', 'message': 'Code is too short (min 10 chars)', 'code': 'INVALID_CODE'
        })
        return

    if len(code) > 50000:
        send_to_connection(connection_id, {
            'action': 'error', 'message': 'Code too large (max 50KB)', 'code': 'CODE_TOO_LARGE'
        })
        return

    # Rate limit: max 3 pipeline runs per session per hour
    allowed, reason = check_pipeline_rate_limit(session_id)
    if not allowed:
        send_to_connection(connection_id, {
            'action': 'error', 'message': reason, 'code': 'RATE_LIMITED'
        })
        return

    # Create run
    run_id = f"RUN-{uuid.uuid4().hex[:8]}"

    # Count stages based on mode
    stage_count = 12 if mode == 'optB' else 9

    try:
        create_pipeline_run(session_id, run_id, mode, code)

        # Start Step Functions execution
        sfn_client.start_execution(
            stateMachineArn=os.environ['STATE_MACHINE_ARN'],
            name=run_id,
            input=json.dumps({
                'sessionId': session_id,
                'runId': run_id,
                'connectionId': connection_id,
                'code': code,
                'mode': mode,
                'previousResults': {},
            }),
        )

        send_to_connection(connection_id, {
            'action': 'pipeline_started',
            'runId': run_id,
            'stageCount': stage_count,
        })
        print(f"Pipeline started: runId={run_id}")

    except Exception as e:
        print(f"Pipeline start error: {traceback.format_exc()}")
        send_to_connection(connection_id, {
            'action': 'error', 'message': f'Failed to start pipeline: {str(e)}', 'code': 'START_FAILED'
        })
