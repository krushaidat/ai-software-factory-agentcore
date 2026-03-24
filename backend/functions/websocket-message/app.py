import json
import os
import boto3
from utils.response import ws_ok
from utils.websocket import send_to_connection

lambda_client = boto3.client('lambda')

# Map action to Lambda function name (env vars set by SAM)
ACTION_MAP = {
    'copilot': 'COPILOT_FUNCTION_NAME',
    'pipeline_start': 'PIPELINE_START_FUNCTION_NAME',
}

def handler(event, context):
    connection_id = event['requestContext']['connectionId']
    body = json.loads(event.get('body', '{}'))
    action = body.get('action', '')

    if action == 'ping':
        send_to_connection(connection_id, {'action': 'pong'})
        return ws_ok()

    if action == 'init':
        # Client is initializing — acknowledge
        send_to_connection(connection_id, {
            'action': 'init_ack',
            'sessionId': body.get('sessionId', ''),
        })
        return ws_ok()

    # Route to appropriate handler Lambda
    func_env = ACTION_MAP.get(action)
    if func_env:
        func_name = os.environ.get(func_env)
        if func_name:
            # Async invoke — the handler Lambda will push responses via WebSocket
            lambda_client.invoke(
                FunctionName=func_name,
                InvocationType='Event',  # async
                Payload=json.dumps({
                    'connectionId': connection_id,
                    'body': body,
                    'requestContext': event['requestContext'],
                }),
            )
            return ws_ok()

    send_to_connection(connection_id, {
        'action': 'error',
        'message': f'Unknown action: {action}',
        'code': 'UNKNOWN_ACTION',
    })
    return ws_ok()
