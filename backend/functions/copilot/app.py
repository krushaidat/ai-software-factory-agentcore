import json
import traceback
from utils.bedrock import invoke_stream
from utils.websocket import send_to_connection
from utils.dynamodb import get_session, update_session, create_session, check_rate_limit
from prompts import build_system_prompt

def handler(event, context):
    # This is invoked async by the message router
    connection_id = event['connectionId']
    body = event['body']
    session_id = body.get('sessionId', '')
    user_message = body.get('message', '')

    print(f"Copilot invoked: sessionId={session_id}, message={user_message[:50]}")

    if not user_message:
        send_to_connection(connection_id, {
            'action': 'error',
            'message': 'No message provided',
            'code': 'MISSING_MESSAGE',
        })
        return

    # Get session and conversation history — auto-create if missing
    session = get_session(session_id)
    if not session:
        print(f"Session {session_id} not found, creating...")
        create_session(session_id)
        session = get_session(session_id)
    if not session:
        send_to_connection(connection_id, {
            'action': 'error',
            'message': 'Failed to create session',
            'code': 'SESSION_ERROR',
        })
        return

    # ── Rate limit check ──
    allowed, reason = check_rate_limit(session_id)
    if not allowed:
        print(f"Rate limited: sessionId={session_id}, reason={reason}")
        send_to_connection(connection_id, {
            'action': 'error',
            'message': reason,
            'code': 'RATE_LIMITED',
        })
        return

    history = session.get('conversationHistory', [])

    # Add user message
    history.append({'role': 'user', 'content': user_message})

    # Keep only last 20 messages to stay within context limits
    if len(history) > 20:
        history = history[-20:]

    # Build system prompt
    system_prompt = build_system_prompt(session=session)

    # Stream from Bedrock
    full_response = ''
    try:
        print(f"Invoking Bedrock with {len(history)} messages...")
        for chunk in invoke_stream(system_prompt, history):
            full_response += chunk
            send_to_connection(connection_id, {
                'action': 'copilot_chunk',
                'content': chunk,
                'done': False,
            })
        print(f"Bedrock streaming complete: {len(full_response)} chars")
    except Exception as e:
        print(f"Bedrock error: {traceback.format_exc()}")
        send_to_connection(connection_id, {
            'action': 'error',
            'message': f'Bedrock error: {str(e)}',
            'code': 'BEDROCK_ERROR',
        })
        return

    # Add assistant response to history
    history.append({'role': 'assistant', 'content': full_response})

    # Save updated history
    update_session(session_id, {'conversationHistory': history})

    # Generate follow-up suggestions based on the response
    suggestions = generate_follow_ups(full_response)

    # Send completion signal
    send_to_connection(connection_id, {
        'action': 'copilot_chunk',
        'content': '',
        'done': True,
        'suggestedQuestions': suggestions,
    })


def generate_follow_ups(response):
    """Generate contextual follow-up questions based on the response content."""
    suggestions = []

    response_lower = response.lower()

    if 'misra' in response_lower:
        suggestions.append('What other MISRA rules were violated?')
    if 'asil' in response_lower or 'safety' in response_lower:
        suggestions.append('Show the safety evidence chain')
    if 'vew' in response_lower or 'hil' in response_lower:
        suggestions.append('Why was VEW-001 selected over HIL-003?')
    if 'cost' in response_lower or 'saving' in response_lower:
        suggestions.append("What's the annualized cost impact?")
    if 'promotion' in response_lower or 'block' in response_lower:
        suggestions.append('What blocks promotion to staging?')
    if 'defect' in response_lower or 'cluster' in response_lower:
        suggestions.append('How does the defect feedback loop work?')
    if 'bedrock' in response_lower or 'aws' in response_lower:
        suggestions.append('Which AWS services power this stage?')

    # Always include at least 2 suggestions
    default_suggestions = [
        "What's the estimated cost impact?",
        'Explain the promotion gate decision',
        'How does the knowledge graph work?',
    ]

    while len(suggestions) < 2:
        for s in default_suggestions:
            if s not in suggestions:
                suggestions.append(s)
                break

    return suggestions[:3]
