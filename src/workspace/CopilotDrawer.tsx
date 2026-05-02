/**
 * Slide-in copilot panel from the right edge.
 *
 * Vuexy-style: not always visible. User opens it via a chat-bubble button in
 * the TopBar (or via Cmd+J keyboard shortcut). Slides in from right with a
 * scrim behind it. Closes on Esc, scrim click, or X.
 *
 * Functionality is the inline-copilot logic that previously lived in RightRail
 * (uses `useCopilot`). Same chat history, suggested questions, send box, badges.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../config/colors';
import { Icon } from '../design/icons';
import { useCopilot } from '../hooks/useCopilot';
import { ChatMessage } from '../components/copilot/ChatMessage';
import { TypingIndicator } from '../components/copilot/TypingIndicator';
import { StreamingMessage } from '../components/copilot/StreamingMessage';
import { QuestionChips } from '../components/copilot/QuestionChips';

const PANEL_WIDTH = 420;

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 8px',
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

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function CopilotDrawer({ open, onClose, sessionId }: CopilotDrawerProps) {
  const {
    messages,
    isTyping,
    currentQuestions,
    streamingContent,
    sendMessage,
    isLive,
  } = useCopilot(sessionId);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, streamingContent]);

  // Focus the input when the drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = () => {
    const q = input.trim();
    if (!q || isTyping) return;
    sendMessage(q);
    setInput('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(11, 8, 22, 0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 900,
            }}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: PANEL_WIDTH + 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: PANEL_WIDTH + 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: PANEL_WIDTH,
              background: C.surface,
              borderLeft: `1px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 901,
              boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #8c57ff 0%, #a08cff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(140, 87, 255, 0.4)',
                  }}
                >
                  <Icon name="brainCircuit" size="md" color="#fff" />
                </div>
                <div>
                  <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>AI Copilot</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <Badge label={isLive ? 'Live' : 'Offline'} color={isLive ? C.ok : C.warn} />
                    <Badge label="Bedrock" color={C.info} />
                    <Badge label="Memory" color={C.purple} />
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close copilot"
                style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: C.dim }}
              >
                <Icon name="x" size="md" />
              </button>
            </div>

            {/* Message list */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.length === 0 && !isTyping && (
                <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '40px 12px' }}>
                  Ask anything about the pipeline, agents, or compliance evidence.
                </div>
              )}
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {isTyping && streamingContent && <StreamingMessage content={streamingContent} />}
              {isTyping && !streamingContent && <TypingIndicator />}
            </div>

            {/* Suggested questions */}
            {currentQuestions.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: `1px solid ${C.border}` }}>
                <QuestionChips
                  questions={currentQuestions}
                  onSelect={(q) => sendMessage(q)}
                />
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                placeholder="Ask the copilot…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                disabled={isTyping}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                  fontSize: 13,
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isTyping}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: !input.trim() || isTyping ? C.dim : C.accent,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                  boxShadow: !input.trim() || isTyping ? 'none' : '0 4px 12px rgba(140, 87, 255, 0.3)',
                  transition: 'all 0.15s',
                }}
              >
                Send
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
