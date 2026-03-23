import { useState, useCallback, useRef, useEffect } from 'react';
import type { CopilotMessage } from '../types';
import { COPILOT_QA, TYPING_DELAY_MS, INITIAL_QUESTIONS } from '../data/copilotResponses';
import { useWebSocket } from './useWebSocket';

export function useCopilot(sessionId: string) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<string[]>(INITIAL_QUESTIONS);
  const [streamingContent, setStreamingContent] = useState('');
  const streamRef = useRef('');
  const { send, subscribe, isLive, connected } = useWebSocket(sessionId);

  // Subscribe to copilot chunks from WebSocket
  useEffect(() => {
    if (!isLive) return;

    const unsub = subscribe('copilot_chunk', (data: any) => {
      if (data.done) {
        // Streaming complete — finalize the message
        setIsTyping(false);
        const finalContent = streamRef.current;
        streamRef.current = '';
        setStreamingContent('');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: finalContent },
        ]);
        if (data.suggestedQuestions?.length) {
          setCurrentQuestions(data.suggestedQuestions);
        }
      } else {
        // Accumulate streaming content
        streamRef.current += data.content;
        setStreamingContent(streamRef.current);
      }
    });

    const unsubErr = subscribe('error', (data: any) => {
      setIsTyping(false);
      streamRef.current = '';
      setStreamingContent('');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${data.message}. Falling back to offline mode.` },
      ]);
    });

    return () => {
      unsub();
      unsubErr();
    };
  }, [isLive, subscribe]);

  const sendMessage = useCallback(
    (message: string) => {
      // Add user message
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      setIsTyping(true);

      if (isLive && connected) {
        // Live mode: send to Bedrock via WebSocket
        streamRef.current = '';
        setStreamingContent('');
        send({
          action: 'copilot',
          message,
          sessionId,
        });
      } else {
        // Fallback mode: use hardcoded responses
        setTimeout(() => {
          const qa = COPILOT_QA[message];
          const response = qa
            ? qa.response
            : "I can help with questions about the pipeline, code findings, safety compliance, and more. Try asking about a specific stage or finding.";
          const followUps = qa?.followUps || INITIAL_QUESTIONS.slice(0, 3);

          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response },
          ]);
          setIsTyping(false);
          setCurrentQuestions(followUps);
        }, TYPING_DELAY_MS);
      }
    },
    [isLive, connected, send, sessionId],
  );

  return {
    messages,
    isTyping,
    currentQuestions,
    streamingContent,
    sendMessage,
    isLive: isLive && connected,
  };
}
