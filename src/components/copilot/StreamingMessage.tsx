import { C } from '../../config/colors';

interface StreamingMessageProps {
  content: string;
}

function renderMarkdown(text: string) {
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

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null;
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        maxWidth: '88%',
        fontSize: 13,
        lineHeight: 1.5,
        color: C.muted,
      }}
    >
      {renderMarkdown(content)}
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 14,
          background: C.accent,
          marginLeft: 2,
          animation: 'blink 1s infinite',
          verticalAlign: 'text-bottom',
        }}
      />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
