import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../../config/colors';
import { useCopilot } from '../../hooks/useCopilot';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { QuestionChips } from './QuestionChips';
import { StreamingMessage } from './StreamingMessage';

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const sessionId = getSessionId();

export function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, streamingContent]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 380,
            height: '100vh',
            background: C.bg,
            borderLeft: `1px solid ${C.border}`,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div className="flex items-center" style={{ gap: 10 }}>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>
                AI Copilot
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: isLive ? C.okDim : C.orangeDim,
                  color: isLive ? C.ok : C.orange,
                  border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(255,153,0,0.3)'}`,
                }}
              >
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                fontSize: 18,
                padding: 4,
                lineHeight: 1,
              }}
            >
              &#10005;
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3"
            style={{
              overflowY: 'auto',
              padding: '16px 16px 8px',
            }}
          >
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

          {/* Question chips + input */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: '12px 16px 16px',
            }}
          >
            <QuestionChips
              questions={currentQuestions}
              onSelect={handleSelect}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the pipeline..."
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: C.text,
                  fontSize: 13,
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
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
