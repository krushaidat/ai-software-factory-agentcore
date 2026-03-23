import json

def ok(body=None):
    return {'statusCode': 200, 'body': json.dumps(body or {})}

def error(status, message):
    return {'statusCode': status, 'body': json.dumps({'error': message})}

def ws_ok():
    return {'statusCode': 200}
