import json
import uuid
from utils.dynamodb import create_session, get_session, update_session
from utils.response import ok, error

def handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', '')
    path = event.get('rawPath', '')

    if method == 'POST' and path == '/api/sessions':
        body = json.loads(event.get('body', '{}'))
        mode = body.get('mode', 'base')
        session_id = create_session(mode=mode)
        return ok({'sessionId': session_id})

    if method == 'GET' and '/api/sessions/' in path:
        session_id = path.split('/api/sessions/')[1]
        session = get_session(session_id)
        if not session:
            return error(404, 'Session not found')
        # Remove internal fields
        session.pop('ttl', None)
        session.pop('conversationHistory', None)  # Don't expose full history via REST
        return ok(session)

    return error(400, 'Unknown route')
