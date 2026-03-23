import type { PRData } from '../types';

export const PR: PRData = {
  title: 'PR #1847: Fix brake ECU CAN timeout handling',
  author: 'M. Weber',
  branch: 'feature/brake-ecu-can-timeout',
  target: 'integration/v3.4.2',
  files: [
    { name: 'src/can_handler.c', add: 47, del: 12 },
    { name: 'src/diag_logger.c', add: 23, del: 0 },
    { name: 'include/can_config.h', add: 5, del: 1 },
  ],
  diff: [
    { t: ' ', l: 'static void CAN_TimeoutHandler(void) {' },
    { t: ' ', l: '    uint32_t elapsed = HAL_GetTick() - last_msg_ts;' },
    { t: '-', l: '    if (elapsed > TIMEOUT_MS) {' },
    { t: '-', l: '        BrakeCtrl_SetFallback();' },
    { t: '-', l: '    }' },
    { t: '+', l: '    if (elapsed > CAN_TIMEOUT_THRESHOLD_MS) {' },
    { t: '+', l: '        DiagLog_Write(DIAG_CAN_TIMEOUT, elapsed);' },
    { t: '+', l: '        if (elapsed > CAN_CRITICAL_THRESHOLD_MS) {' },
    { t: '+', l: '            BrakeCtrl_SetSafeState(SAFE_STATE_DEGRADED);' },
    { t: '+', l: '            EventBus_Publish(EVT_BRAKE_DEGRADED, NULL);' },
    { t: '+', l: '        } else {' },
    { t: '+', l: '            BrakeCtrl_SetFallback();' },
    { t: '+', l: '        }' },
    { t: '+', l: '    }' },
    { t: ' ', l: '}' },
  ],
};
