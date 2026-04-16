import os
import sys
sys.path.insert(0, '/opt/python')  # Lambda layer path

# Import jwt_utils from auth-login (bundled in layer or inline)
import json
import hmac
import hashlib
import base64
import time

def _b64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def _b64url_decode(s):
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)

def verify_token(token, secret):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        signing_input = f"{header}.{payload}"
        expected_sig = _b64url_encode(
            hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(signature, expected_sig):
            return None
        claims = json.loads(_b64url_decode(payload))
        if claims.get('exp', 0) < time.time():
            return None
        return claims
    except Exception:
        return None

def handler(event, context):
    token = None

    # Extract token from query string
    qs = event.get('queryStringParameters') or {}
    token = qs.get('token', '')

    if not token:
        # Try headers
        headers = event.get('headers') or {}
        auth = headers.get('Authorization', headers.get('authorization', ''))
        if auth.startswith('Bearer '):
            token = auth[7:]

    if not token:
        raise Exception('Unauthorized')

    secret = os.environ['JWT_SECRET']
    claims = verify_token(token, secret)

    if not claims:
        raise Exception('Unauthorized')

    # Build IAM policy
    method_arn = event.get('methodArn', '*')

    return {
        'principalId': claims['sub'],
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': 'Allow',
                'Resource': method_arn,
            }]
        },
        'context': {
            'username': claims['sub'],
        }
    }
