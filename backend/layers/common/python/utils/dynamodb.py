import boto3
import os
import time
import uuid

_ddb = boto3.resource('dynamodb')

def sessions_table():
    return _ddb.Table(os.environ['SESSIONS_TABLE'])

def connections_table():
    return _ddb.Table(os.environ['CONNECTIONS_TABLE'])

def create_session(session_id=None, mode='base'):
    sid = session_id or str(uuid.uuid4())[:8]
    sessions_table().put_item(Item={
        'sessionId': sid,
        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'mode': mode,
        'status': 'active',
        'conversationHistory': [],
        'ttl': int(time.time()) + 86400,  # 24h
    })
    return sid

def get_session(session_id):
    resp = sessions_table().get_item(Key={'sessionId': session_id})
    return resp.get('Item')

def update_session(session_id, updates):
    expr_parts = []
    names = {}
    values = {}
    for i, (k, v) in enumerate(updates.items()):
        attr = f'#a{i}'
        val = f':v{i}'
        expr_parts.append(f'{attr} = {val}')
        names[attr] = k
        values[val] = v
    sessions_table().update_item(
        Key={'sessionId': session_id},
        UpdateExpression='SET ' + ', '.join(expr_parts),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )

def save_connection(connection_id, session_id):
    connections_table().put_item(Item={
        'connectionId': connection_id,
        'sessionId': session_id,
        'connectedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'ttl': int(time.time()) + 7200,  # 2h
    })

def remove_connection(connection_id):
    connections_table().delete_item(Key={'connectionId': connection_id})

def get_connections_for_session(session_id):
    resp = connections_table().query(
        IndexName='SessionIndex',
        KeyConditionExpression='sessionId = :sid',
        ExpressionAttributeValues={':sid': session_id},
    )
    return [item['connectionId'] for item in resp.get('Items', [])]
