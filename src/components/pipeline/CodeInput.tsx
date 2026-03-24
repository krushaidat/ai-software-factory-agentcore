import { C } from '../../config/colors';
import { Card, AnimateIn } from '../shared';

interface CodeInputProps {
  onSubmit: (code: string) => void;
  stageCount: number;
  isRunning?: boolean;
}

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
  const canSubmit = !isRunning;

  return (
    <AnimateIn>
      <Card>
        <div style={{ color: C.accent, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
          Brake ECU Source Code
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          PR #1847: Fix brake ECU CAN timeout handling — {DEMO_CODE.length.toLocaleString()} characters of embedded C code
        </div>

        <pre style={{
          background: '#000',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 16,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          lineHeight: 1.6,
          color: C.text,
          maxHeight: 280,
          overflowY: 'auto',
          margin: 0,
        }}>
          {DEMO_CODE}
        </pre>

        <button
          onClick={() => canSubmit && onSubmit(DEMO_CODE)}
          disabled={!canSubmit}
          style={{
            marginTop: 16,
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
          {isRunning ? '⏳ Pipeline running — analyzing with Bedrock Claude...' : `🚀 Run AI Pipeline → ${stageCount} stages (live Bedrock analysis)`}
        </button>
      </Card>
    </AnimateIn>
  );
}
