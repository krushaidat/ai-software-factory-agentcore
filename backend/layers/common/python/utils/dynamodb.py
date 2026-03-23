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


# ── Rate Limiting ──────────────────────────────────────────

# Limits
RATE_LIMIT_PER_MINUTE = 6        # 1 per 10 seconds
RATE_LIMIT_PER_HOUR = 10
RATE_LIMIT_PER_DAY = 50
MIN_INTERVAL_SECONDS = 10        # minimum gap between questions

def check_rate_limit(session_id):
    """Check if session is within rate limits. Returns (allowed: bool, reason: str)."""
    from decimal import Decimal

    now = int(time.time())
    session = get_session(session_id)
    if not session:
        return True, ''

    # Get rate limit counters (stored on session)
    rl = session.get('rateLimit', {})
    last_request = int(rl.get('lastRequestAt', 0) or 0)
    minute_count = int(rl.get('minuteCount', 0) or 0)
    minute_window = int(rl.get('minuteWindow', 0) or 0)
    hour_count = int(rl.get('hourCount', 0) or 0)
    hour_window = int(rl.get('hourWindow', 0) or 0)
    day_count = int(rl.get('dayCount', 0) or 0)
    day_window = int(rl.get('dayWindow', 0) or 0)

    # Check minimum interval
    if last_request and (now - last_request) < MIN_INTERVAL_SECONDS:
        wait = MIN_INTERVAL_SECONDS - (now - last_request)
        return False, f'Please wait {wait} seconds between questions.'

    # Reset windows if expired
    if now - minute_window > 60:
        minute_count = 0
        minute_window = now
    if now - hour_window > 3600:
        hour_count = 0
        hour_window = now
    if now - day_window > 86400:
        day_count = 0
        day_window = now

    # Check limits
    if minute_count >= RATE_LIMIT_PER_MINUTE:
        return False, f'Rate limit: max {RATE_LIMIT_PER_MINUTE} questions per minute. Please wait.'
    if hour_count >= RATE_LIMIT_PER_HOUR:
        return False, f'Rate limit: max {RATE_LIMIT_PER_HOUR} questions per hour. Please try again later.'
    if day_count >= RATE_LIMIT_PER_DAY:
        return False, f'Daily limit reached ({RATE_LIMIT_PER_DAY} questions). Please come back tomorrow.'

    # Update counters atomically
    update_session(session_id, {
        'rateLimit': {
            'lastRequestAt': Decimal(str(now)),
            'minuteCount': Decimal(str(minute_count + 1)),
            'minuteWindow': Decimal(str(minute_window if minute_window else now)),
            'hourCount': Decimal(str(hour_count + 1)),
            'hourWindow': Decimal(str(hour_window if hour_window else now)),
            'dayCount': Decimal(str(day_count + 1)),
            'dayWindow': Decimal(str(day_window if day_window else now)),
        }
    })

    return True, ''
