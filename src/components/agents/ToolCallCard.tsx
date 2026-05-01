import { memo, useMemo, useState } from 'react';
import { C } from '../../config/colors';
import { Icon } from '../../design/icons';
import type { ReasoningTreeNode } from '../../services/agentcore-events';
import { fmtMs, MONO, truncate } from './agentTraceHelpers';

interface ToolCallCardProps {
  node: ReasoningTreeNode;
}

const VIA_LABEL: Record<string, string> = {
  agentcore_gateway: 'AgentCore Gateway',
  code_interpreter: 'Code Interpreter',
  browser: 'AgentCore Browser',
};

function summarizeResult(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'string') return truncate(result, 120);
  if (Array.isArray(result)) return `${result.length} items`;
  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (Array.isArray(obj.findings)) return `${(obj.findings as unknown[]).length} findings`;
    if (Array.isArray(obj.matches)) return `${(obj.matches as unknown[]).length} matches`;
    if (typeof obj.verdict === 'string') return `verdict: ${obj.verdict}`;
    if (typeof obj.title === 'string') return obj.title as string;
    return truncate(JSON.stringify(obj), 120);
  }
  return String(result);
}

function ToolCallCardImpl({ node }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const p = (node.payload ?? {}) as Record<string, unknown>;

  const toolName = typeof p.tool_name === 'string' ? (p.tool_name as string) : 'tool';
  const via = typeof p.via === 'string' ? (p.via as string) : 'agentcore_gateway';
  const viaLabel = VIA_LABEL[via] ?? via;
  const params = (p.params ?? {}) as Record<string, unknown>;
  const result = p.result;
  const resultSummary = useMemo(() => summarizeResult(result), [result]);
  const error = typeof p.error === 'string' ? (p.error as string) : null;

  const paramsKvs = useMemo(() => {
    const out = Object.entries(params).slice(0, 4);
    return out.map(([k, v]) => `${k}=${truncate(v, 32)}`).join(', ');
  }, [params]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        background: 'rgba(59,130,246,0.06)',
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '8px 10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Icon name="wrench" size="sm" color={C.info} />
        <span style={{ color: C.text, fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>
          {toolName}()
        </span>
        <span
          style={{
            fontSize: 10,
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: '1px 6px',
            fontFamily: MONO,
            letterSpacing: '0.02em',
          }}
          title={`Routed via ${viaLabel}`}
        >
          via {viaLabel}
        </span>
        <div style={{ flex: 1 }} />
        {node.durationMs !== undefined && (
          <span style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>
            {fmtMs(node.durationMs)}
          </span>
        )}
        {(Object.keys(params).length > 0 || result != null) && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.muted,
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: MONO,
            }}
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
        )}
      </div>

      {paramsKvs && !expanded && (
        <div style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>
          ({paramsKvs})
        </div>
      )}

      {!expanded && resultSummary && (
        <div
          style={{
            color: error ? C.crit : C.text,
            fontSize: 11.5,
            fontFamily: MONO,
            paddingLeft: 12,
            borderLeft: `2px solid ${error ? C.crit : C.accent}`,
          }}
        >
          {error ? `error: ${error}` : `\u2192 ${resultSummary}`}
        </div>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {Object.keys(params).length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                params
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 8,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.text,
                  fontSize: 11,
                  fontFamily: MONO,
                  overflowX: 'auto',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>
          )}
          {result != null && (
            <div>
              <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                result
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 8,
                  background: C.bg,
                  border: `1px solid ${error ? C.crit : C.border}`,
                  borderRadius: 6,
                  color: error ? C.crit : C.text,
                  fontSize: 11,
                  fontFamily: MONO,
                  overflowX: 'auto',
                  maxHeight: 240,
                }}
              >
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ToolCallCard = memo(ToolCallCardImpl);
