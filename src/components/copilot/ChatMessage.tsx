import type { ReactNode } from 'react';
import { C } from '../../config/colors';
import type { CopilotMessage } from '../../types';

interface ChatMessageProps {
  message: CopilotMessage;
}

/** Render inline markdown: **bold** and `code` */
function renderInline(text: string): ReactNode[] {
  // Split on **bold** and `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: C.text, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9em',
            background: C.raised,
            padding: '1px 5px',
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            color: C.accent,
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Parse message content into blocks: paragraphs, code blocks, bullet lists */
function renderMarkdown(content: string): ReactNode[] {
  const result: ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      result.push(
        <pre
          key={`code-${result.length}`}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            background: C.raised,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '10px 12px',
            margin: '6px 0',
            overflowX: 'auto',
            color: C.text,
            lineHeight: 1.5,
          }}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Bullet list items (- or *)
    if (/^\s*[-*]\s/.test(line)) {
      const bullets: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        bullets.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      result.push(
        <ul
          key={`ul-${result.length}`}
          style={{ margin: '4px 0', paddingLeft: 18, listStyleType: 'disc' }}
        >
          {bullets.map((b, j) => (
            <li key={j} style={{ marginBottom: 2 }}>
              {renderInline(b)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    result.push(
      <div key={`p-${result.length}`} style={{ marginBottom: 4 }}>
        {renderInline(line)}
      </div>,
    );
    i++;
  }

  return result;
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
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
}
