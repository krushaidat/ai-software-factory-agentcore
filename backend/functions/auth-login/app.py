import json
import os
import hmac
import hashlib
import boto3
from jwt_utils import create_token

dynamodb = boto3.resource('dynamodb')

def hash_password(password: str, salt: str) -> str:
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()

def handler(event, context):
    # Handle CORS preflight
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    }

    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip().lower()
        password = body.get('password', '')

        if not username or not password:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Username and password required'})}

        table = dynamodb.Table(os.environ['USERS_TABLE'])
        result = table.get_item(Key={'username': username})
        user = result.get('Item')

        if not user:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Invalid credentials'})}

        expected_hash = user['passwordHash']
        salt = user['salt']
        actual_hash = hash_password(password, salt)

        if not hmac.compare_digest(expected_hash, actual_hash):
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Invalid credentials'})}

        secret = os.environ['JWT_SECRET']
        token = create_token(username, secret)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'token': token,
                'username': username,
                'displayName': user.get('displayName', username),
            })
        }
    except Exception as e:
        print(f"Login error: {e}")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Internal server error'})}
