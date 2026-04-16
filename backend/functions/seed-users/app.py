import json
import os
import hmac
import hashlib
import secrets
import boto3

dynamodb = boto3.resource('dynamodb')

def hash_password(password, salt):
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()

DEFAULT_USERS = [
    {'username': 'admin', 'password': 'StormReply2025!', 'displayName': 'Admin'},
    {'username': 'demo', 'password': 'DemoUser2025!', 'displayName': 'Demo User'},
    {'username': 'bosch', 'password': 'BoschDemo2025!', 'displayName': 'Bosch Engineer'},
    {'username': 'bmw', 'password': 'BMWDemo2025!', 'displayName': 'BMW Engineer'},
]

def handler(event, context):
    table = dynamodb.Table(os.environ['USERS_TABLE'])
    created = []

    for user in DEFAULT_USERS:
        salt = secrets.token_hex(16)
        pw_hash = hash_password(user['password'], salt)

        try:
            table.put_item(
                Item={
                    'username': user['username'],
                    'passwordHash': pw_hash,
                    'salt': salt,
                    'displayName': user['displayName'],
                },
                ConditionExpression='attribute_not_exists(username)',
            )
            created.append(user['username'])
        except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            pass  # User already exists

    return {
        'statusCode': 200,
        'body': json.dumps({'created': created, 'total': len(DEFAULT_USERS)}),
    }
