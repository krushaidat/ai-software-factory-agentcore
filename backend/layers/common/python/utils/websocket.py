import boto3
import json
import os

def get_apigw_client():
    endpoint = os.environ.get('WEBSOCKET_API_ENDPOINT', '')
    # endpoint format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
    return boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)

def send_to_connection(connection_id, data):
    client = get_apigw_client()
    try:
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data).encode('utf-8'),
        )
    except client.exceptions.GoneException:
        # Connection is stale, clean up
        from utils.dynamodb import remove_connection
        remove_connection(connection_id)

def broadcast_to_session(session_id, data):
    from utils.dynamodb import get_connections_for_session
    connection_ids = get_connections_for_session(session_id)
    for cid in connection_ids:
        send_to_connection(cid, data)
