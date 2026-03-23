import type { ReactNode } from 'react';
import { C } from '../../config/colors';
import type { CopilotMessage } from '../../types';

interface ChatMessageProps {
  message: CopilotMessage;
}

function renderBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: C.text, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.6,
          background: isUser ? C.accentDim : C.surface,
          border: `1px solid ${isUser ? C.accentBorder : C.border}`,
          color: C.muted,
        }}
      >
        {renderBold(message.content)}
      </div>
    </div>
  );
}
