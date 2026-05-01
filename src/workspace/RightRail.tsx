import { useEffect, useRef, useState } from 'react';
import { C } from '../config/colors';
import { tokens } from '../design/tokens';
import { GlassCard } from '../design/glass';
import { Icon } from '../design/icons';
import { useCopilot } from '../hooks/useCopilot';
import { ChatMessage } from '../components/copilot/ChatMessage';
import { TypingIndicator } from '../components/copilot/TypingIndicator';
import { StreamingMessage } from '../components/copilot/StreamingMessage';
import { QuestionChips } from '../components/copilot/QuestionChips';

interface RightRailProps {
  width: number;
  topOffset: number;
  bottomOffset: number;
  sessionId: string;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        background: `${color}1f`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {label}
    </span>
  );
}

/** Always-visible inline AI Copilot. Replaces the slide-in panel. */
export function RightRail({ width, topOffset, bottomOffset, sessionId }: RightRailProps) {
  const {
    messages,
    isTyping,
    currentQuestions,
    streamingContent,
    sendMessage,
    isLive,
  } = useCopilot(sessionId);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, streamingContent]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    setInput('');
    sendMessage(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSelect(question: string) {
    if (isTyping) return;
    sendMessage(question);
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: topOffset,
        bottom: bottomOffset,
        right: 0,
        width,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <GlassCard
        padding={0}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkles" size="md" color={C.accent} />
            <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>
              AI Copilot
            </span>
            <Badge label={isLive ? 'LIVE' : 'OFFLINE'} color={isLive ? C.ok : C.orange} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Badge label="Bedrock" color={C.info} />
            <Badge label="Memory" color={tokens.agentColors.test_agent} />
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1"
          style={{
            overflowY: 'auto',
            padding: '14px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: C.dim,
                fontSize: 12,
                padding: '24px 8px',
                textAlign: 'center',
              }}
            >
              Ask anything about the pipeline, agents, or compliance evidence.
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {isTyping && streamingContent && (
            <div style={{ paddingLeft: 4 }}>
              <StreamingMessage content={streamingContent} />
            </div>
          )}
          {isTyping && !streamingContent && (
            <div style={{ paddingLeft: 4 }}>
              <TypingIndicator />
            </div>
          )}
        </div>

        {/* Suggested questions + input */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: '10px 14px 14px',
          }}
        >
          <QuestionChips questions={currentQuestions} onSelect={handleSelect} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the copilot..."
              style={{
                flex: 1,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 12px',
                color: C.text,
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              style={{
                background: input.trim() && !isTyping ? C.accent : C.border,
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                color: input.trim() && !isTyping ? '#fff' : C.dim,
                fontSize: 12,
                fontWeight: 600,
                cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </GlassCard>
    </aside>
  );
}
