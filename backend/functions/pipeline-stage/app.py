import json
import os
import time
import traceback
from utils.bedrock import invoke_json
from utils.websocket import send_to_connection
from utils.dynamodb import update_pipeline_stage
from prompts import get_stage_prompt

def handler(event, context):
    stage_id = event['stageId']
    code = event['code']
    mode = event['mode']
    session_id = event['sessionId']
    run_id = event['runId']
    connection_id = event['connectionId']
    previous_results = event.get('previousResults', {})

    print(f"Stage {stage_id}: sessionId={session_id}, runId={run_id}")

    # Send "running" status to frontend
    try:
        send_to_connection(connection_id, {
            'action': 'stage_update',
            'stageId': stage_id,
            'status': 'running',
        })
    except Exception:
        print(f"Warning: could not send running status (connection may be stale)")

    # Get stage-specific prompt
    system_prompt, user_message = get_stage_prompt(stage_id, code, mode, previous_results)

    # Call Bedrock
    start_time = time.time()
    try:
        result = invoke_json(
            system_prompt,
            [{'role': 'user', 'content': user_message}],
            max_tokens=4096,
            temperature=0.2,
        )
        elapsed = round(time.time() - start_time, 1)
        print(f"Stage {stage_id} completed in {elapsed}s")

    except Exception as e:
        print(f"Stage {stage_id} Bedrock error: {traceback.format_exc()}")
        try:
            send_to_connection(connection_id, {
                'action': 'stage_update',
                'stageId': stage_id,
                'status': 'failed',
                'error': str(e),
            })
        except Exception:
            pass
        raise  # Let Step Functions handle retry/catch

    # Store result in DynamoDB
    try:
        update_pipeline_stage(session_id, run_id, stage_id, result)
    except Exception as e:
        print(f"DynamoDB update warning: {e}")

    # Send completed status with data to frontend
    try:
        send_to_connection(connection_id, {
            'action': 'stage_update',
            'stageId': stage_id,
            'status': 'completed',
            'data': result,
            'elapsed': elapsed,
        })
    except Exception:
        print(f"Warning: could not send completion status")

    # Return result for Step Functions to pass to next stage
    return result
