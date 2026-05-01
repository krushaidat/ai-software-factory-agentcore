import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../../config/colors';
import { GlassCard } from '../../design/glass';
import { Icon } from '../../design/icons';
import type { AgentEvent, AgentName, CodeExecution } from '../../types/agents';
import { agentColor, agentLabel, fmtMs, fmtTime, MONO } from '../../components/agents/agentTraceHelpers';

// Mock executions for offline demo
const MOCK_EXECUTIONS: Array<{ agentName: AgentName; timestamp: string; payload: CodeExecution }> = [
  {
    agentName: 'quality_agent',
    timestamp: new Date().toISOString(),
    payload: {
      language: 'python',
      code: `# MISRA C 2012 Rule 11.3 detection
import re

code = open('/var/code/can_timeout_handler.c').read()
# Find casts between unrelated pointer types
pattern = r'\\(([\\w_]+)\\s*\\*\\)\\s*\\(([\\w_]+)\\s*\\*\\)'
matches = re.findall(pattern, code)
print(f"Found {len(matches)} potential MISRA-11.3 violations")
for m in matches[:5]:
    print(f"  cast: ({m[0]} *) <- ({m[1]} *)")`,
      stdout: 'Found 3 potential MISRA-11.3 violations\n  cast: (DiagCode_t *) <- (uint32_t *)\n  cast: (Brake_State_t *) <- (uint8_t *)\n  cast: (Timer_t *) <- (void *)',
      stderr: null,
      durationMs: 1234,
    },
  },
  {
    agentName: 'safety_agent',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    payload: {
      language: 'python',
      code: `# Cyclomatic complexity calculation
import ast, sys
from radon.complexity import cc_visit

src = open('/var/code/can_timeout_handler.c').read()
# Approximate via control-flow keyword counting
keywords = ['if', 'else', 'while', 'for', 'case', '&&', '||', '?']
complexity = 1 + sum(src.count(k) for k in keywords)
print(f"Cyclomatic complexity: {complexity}")
print(f"HIS metric threshold (10): {'PASS' if complexity <= 10 else 'EXCEEDED'}")`,
      stdout: 'Cyclomatic complexity: 14\nHIS metric threshold (10): EXCEEDED',
      stderr: null,
      durationMs: 856,
    },
  },
  {
    agentName: 'security_agent',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    payload: {
      language: 'python',
      code: `# SAST: detect unbounded copy patterns (CWE-120)
import re

src = open('/var/code/can_timeout_handler.c').read()
# Find strcpy/strcat/sprintf without bounds
risky = re.findall(r'\\b(strcpy|strcat|sprintf|gets)\\s*\\(', src)
print(f"Unsafe string operations: {len(risky)}")
# Find buffer access without index check
unchecked = re.findall(r'(\\w+)\\[([^\\]]+)\\]\\s*=', src)
print(f"Array writes: {len(unchecked)} (manual review recommended)")`,
      stdout: 'Unsafe string operations: 0\nArray writes: 7 (manual review recommended)',
      stderr: null,
      durationMs: 2143,
    },
  },
  {
    agentName: 'integration_agent',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    payload: {
      language: 'python',
      code: `# SBOM dependency parsing
import json
from cyclonedx_bom import generate

bom = generate('package.json')
print(f"Components: {len(bom.components)}")
print(f"Vulnerabilities: {sum(len(c.vulnerabilities) for c in bom.components)}")`,
      stdout: 'Components: 47\nVulnerabilities: 1 (CVE-2024-12345 medium severity in conan/can_stack v4.2.1)',
      stderr: null,
      durationMs: 543,
    },
  },
];

interface Execution {
  id: string;
  agentName: AgentName;
  timestamp: string;
  payload: CodeExecution;
}

interface CodeInterpreterViewProps {
  events?: AgentEvent[];
}

export function CodeInterpreterView({ events = [] }: CodeInterpreterViewProps) {
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const executions: Execution[] = useMemo(() => {
    const live = events
      .filter((e): e is AgentEvent => e.type === 'code_execution')
      .map((e, i) => ({
        id: `${e.spanId}-${i}`,
        agentName: e.agentName,
        timestamp: e.timestamp,
        payload: e.payload as CodeExecution,
      }));
    if (live.length > 0) return live;
    return MOCK_EXECUTIONS.map((m, i) => ({ id: `mock-${i}`, ...m }));
  }, [events]);

  const filtered = useMemo(() => {
    if (agentFilter === 'all') return executions;
    return executions.filter(e => e.agentName === agentFilter);
  }, [executions, agentFilter]);

  const selected = filtered[Math.min(selectedIdx, filtered.length - 1)] ?? filtered[0];
  const totalDuration = executions.reduce((sum, e) => sum + (e.payload.durationMs || 0), 0);
  const avgDuration = executions.length > 0 ? totalDuration / executions.length : 0;

  if (!selected) {
    return (
      <GlassCard style={{ padding: 48, textAlign: 'center' }}>
        <Icon name="terminal" size="xl" color={C.dim} />
        <div style={{ color: C.muted, marginTop: 16 }}>No code executions yet.</div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 180px)' }}>
      <GlassCard style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="terminal" size="md" color={C.warn} />
          <div>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Code Interpreter</div>
            <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>
              {executions.length} executions · {fmtMs(avgDuration)} avg · {fmtMs(totalDuration)} total
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value as AgentName | 'all')}
            style={{ padding: '5px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12 }}>
            <option value="all">All agents</option>
            {(['supervisor','quality_agent','safety_agent','security_agent','test_agent','deployment_agent','integration_agent'] as AgentName[]).map(a => (
              <option key={a} value={a}>{agentLabel(a)}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '60% 40%', gap: 12, minHeight: 0 }}>
        {/* Code panel */}
        <GlassCard style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor(selected.agentName) }} />
              <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{agentLabel(selected.agentName)}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', background: C.warnDim, color: C.warn, borderRadius: 3, fontFamily: MONO }}>
                {selected.payload.language}
              </span>
            </div>
            <span style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>{fmtMs(selected.payload.durationMs)}</span>
          </div>
          <pre style={{ flex: 1, margin: 0, padding: 16, background: '#000', color: C.text, fontFamily: MONO, fontSize: 12, lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {highlightPython(selected.payload.code)}
          </pre>
        </GlassCard>

        {/* Output panel */}
        <GlassCard style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>Output</div>
            <div style={{ color: C.dim, fontSize: 10, fontFamily: MONO }}>{fmtTime(selected.timestamp)}</div>
          </div>
          <pre style={{ flex: 1, margin: 0, padding: 16, background: '#000', fontFamily: MONO, fontSize: 12, lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            <span style={{ color: C.text }}>{selected.payload.stdout || '(no output)'}</span>
            {selected.payload.stderr && (
              <span style={{ color: C.crit, display: 'block', marginTop: 8 }}>{selected.payload.stderr}</span>
            )}
          </pre>
        </GlassCard>
      </div>

      {/* Execution timeline */}
      <GlassCard style={{ padding: '10px 14px', maxHeight: 140, overflowY: 'auto' }}>
        <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Execution history ({filtered.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((exec, idx) => (
            <motion.div
              key={exec.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: '6px 10px',
                background: idx === selectedIdx ? C.accentDim : 'transparent',
                border: `1px solid ${idx === selectedIdx ? C.accent : C.border}`,
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor(exec.agentName) }} />
              <span style={{ color: C.text, fontWeight: 600, minWidth: 100 }}>{agentLabel(exec.agentName)}</span>
              <span style={{ color: C.dim, fontFamily: MONO, fontSize: 10 }}>{fmtMs(exec.payload.durationMs)}</span>
              <span style={{ color: C.muted, fontFamily: MONO, fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {exec.payload.code.split('\n').find(l => l.trim() && !l.trim().startsWith('#'))?.slice(0, 60) || ''}
              </span>
              <span style={{ color: C.ok, fontSize: 12 }}>✓</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// Tiny inline syntax highlighter for python
function highlightPython(code: string): React.ReactNode {
  const tokens = code.split(/(\s+|[(),:[\]{}=+\-*/%<>!&|^~]|"[^"]*"|'[^']*'|#[^\n]*)/);
  const keywords = new Set(['import', 'from', 'def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'as', 'with', 'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'lambda', 'print']);
  return tokens.map((t, i) => {
    if (!t) return null;
    if (t.startsWith('#')) return <span key={i} style={{ color: C.dim, fontStyle: 'italic' }}>{t}</span>;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return <span key={i} style={{ color: C.ok }}>{t}</span>;
    if (keywords.has(t)) return <span key={i} style={{ color: C.purple, fontWeight: 600 }}>{t}</span>;
    if (/^\d+(\.\d+)?$/.test(t)) return <span key={i} style={{ color: C.orange }}>{t}</span>;
    return <span key={i}>{t}</span>;
  });
}
