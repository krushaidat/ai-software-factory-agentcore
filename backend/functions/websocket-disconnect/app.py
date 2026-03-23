from utils.dynamodb import remove_connection
from utils.response import ws_ok

def handler(event, context):
    connection_id = event['requestContext']['connectionId']
    remove_connection(connection_id)
    return ws_ok()
