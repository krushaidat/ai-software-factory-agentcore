import boto3
import json

_client = boto3.client('bedrock-runtime')

MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'

def invoke_stream(system_prompt, messages, max_tokens=1024, temperature=0.3):
    """Generator that yields text chunks from Bedrock Claude streaming response."""
    body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'system': system_prompt,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': temperature,
    }
    response = _client.invoke_model_with_response_stream(
        modelId=MODEL_ID,
        body=json.dumps(body),
    )
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'])
        if chunk.get('type') == 'content_block_delta':
            delta = chunk.get('delta', {})
            if delta.get('type') == 'text_delta':
                yield delta['text']

def invoke_json(system_prompt, messages, max_tokens=4096, temperature=0.2):
    """Invoke Bedrock and return parsed JSON response."""
    body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'system': system_prompt,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': temperature,
    }
    response = _client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body),
    )
    result = json.loads(response['body'].read())
    text = result['content'][0]['text']
    # Try to parse as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
            return json.loads(text)
        if '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
            return json.loads(text)
        raise
