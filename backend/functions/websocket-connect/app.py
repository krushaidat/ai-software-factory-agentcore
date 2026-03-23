import json
import traceback
from utils.dynamodb import save_connection, create_session
from utils.response import ws_ok

def handler(event, context):
    connection_id = event['requestContext']['connectionId']
    # Session ID can come from query string on connect
    query = event.get('queryStringParameters') or {}
    session_id = query.get('sessionId')

    print(f"WebSocket connect: connectionId={connection_id}, sessionId={session_id}")

    try:
        if not session_id:
            session_id = create_session()
            print(f"Created new session: {session_id}")
        else:
            # Client provided sessionId — create session with that ID
            create_session(session_id)
            print(f"Created session with client ID: {session_id}")

        save_connection(connection_id, session_id)
        print(f"Saved connection: {connection_id} -> {session_id}")
    except Exception as e:
        print(f"Connect error: {traceback.format_exc()}")

    return ws_ok()
