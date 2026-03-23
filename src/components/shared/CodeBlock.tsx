
import { C } from '../../config/colors';

interface CodeBlockProps {
  children: React.ReactNode;
}

export function CodeBlock({ children }: CodeBlockProps) {
  return (
    <pre
      style={{
        background: '#000',
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 14,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11.5,
        lineHeight: 1.65,
        color: C.text,
        overflowX: 'auto',
        margin: 0,
      }}
    >
      {children}
    </pre>
  );
}
