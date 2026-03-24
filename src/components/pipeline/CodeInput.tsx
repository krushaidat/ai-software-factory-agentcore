import { useState } from 'react';
import { C } from '../../config/colors';
import { Card, AnimateIn } from '../shared';

interface CodeInputProps {
  onSubmit: (code: string) => void;
  stageCount: number;
  isRunning?: boolean;
}

// Reconstruct full C code from the PR diff
const DEMO_CODE = `// brake_ecu/src/can_handler.c — PR #1847
// Fix brake ECU CAN timeout handling

#include "can_config.h"
#include "diag_logger.h"
#include "brake_ctrl.h"
#include "event_bus.h"

#define CAN_TIMEOUT_THRESHOLD_MS    200
#define CAN_CRITICAL_THRESHOLD_MS   500

static uint32_t last_msg_ts = 0;

static void CAN_TimeoutHandler(void) {
    uint32_t elapsed = HAL_GetTick() - last_msg_ts;
    if (elapsed > CAN_TIMEOUT_THRESHOLD_MS) {
        DiagLog_Write(DIAG_CAN_TIMEOUT, elapsed);
        if (elapsed > CAN_CRITICAL_THRESHOLD_MS) {
            BrakeCtrl_SetSafeState(SAFE_STATE_DEGRADED);
            EventBus_Publish(EVT_BRAKE_DEGRADED, NULL);
        } else {
            BrakeCtrl_SetFallback();
        }
    }
}

void CAN_ProcessMessage(CAN_RxHeaderTypeDef *header, uint8_t *data) {
    last_msg_ts = HAL_GetTick();

    if (header->StdId == CAN_ID_BRAKE_CMD) {
        BrakeCtrl_ProcessCommand(data, header->DLC);
    }

    // Queue diagnostic data
    DiagEntry_t entry = {
        .timestamp = last_msg_ts,
        .msgId = header->StdId,
        .dlc = header->DLC
    };
    RingBuffer_Push(&diag_buf, &entry);
}

void CAN_Init(void) {
    HAL_CAN_RegisterCallback(&hcan1, HAL_CAN_RX_FIFO0_MSG_PENDING_CB_ID, CAN_ProcessMessage);
    last_msg_ts = HAL_GetTick();
}`;

export function CodeInput({ onSubmit, stageCount, isRunning }: CodeInputProps) {
  const [tab, setTab] = useState<'demo' | 'custom'>('demo');
  const [customCode, setCustomCode] = useState('');

  const code = tab === 'demo' ? DEMO_CODE : customCode;
  const canSubmit = code.trim().length >= 10 && !isRunning;

  return (
    <AnimateIn>
      <Card>
        {/* Tab bar */}
        <div className="flex gap-2 mb-4">
          {(['demo', 'custom'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${tab === t ? C.accentBorder : C.border}`,
                background: tab === t ? C.accentDim : 'transparent',
                color: tab === t ? C.accent : C.muted,
                cursor: 'pointer',
              }}
            >
              {t === 'demo' ? 'Demo Code (Brake ECU)' : 'Paste Your Code'}
            </button>
          ))}
        </div>

        {/* Code area */}
        {tab === 'demo' ? (
          <pre style={{
            background: '#000',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            color: C.text,
            maxHeight: 300,
            overflowY: 'auto',
            margin: 0,
          }}>
            {DEMO_CODE}
          </pre>
        ) : (
          <textarea
            value={customCode}
            onChange={e => setCustomCode(e.target.value)}
            placeholder={'Paste your C/C++ code here...\n\nThe AI pipeline will analyze it for MISRA violations, security issues, safety compliance, and more.'}
            style={{
              width: '100%',
              minHeight: 250,
              background: '#000',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 16,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              lineHeight: 1.6,
              color: C.text,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        )}

        {/* Char count */}
        <div style={{ fontSize: 11, color: C.dim, marginTop: 8, textAlign: 'right' }}>
          {code.length.toLocaleString()} characters
          {tab === 'custom' && code.length < 10 && (
            <span style={{ color: C.warn, marginLeft: 8 }}>Min 10 characters</span>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={() => canSubmit && onSubmit(code)}
          disabled={!canSubmit}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px 0',
            background: canSubmit ? C.accentDim : C.surface,
            border: `1px solid ${canSubmit ? C.accentBorder : C.border}`,
            borderRadius: 8,
            color: canSubmit ? C.accent : C.dim,
            fontWeight: 600,
            fontSize: 14,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {isRunning ? 'Pipeline running...' : `Run AI Pipeline \u2192 ${stageCount} stages (live Bedrock analysis)`}
        </button>
      </Card>
    </AnimateIn>
  );
}
