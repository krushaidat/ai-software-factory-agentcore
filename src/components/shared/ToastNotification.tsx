import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../../config/colors';
import { useToast } from '../../hooks/useToast';
import type { ToastType } from '../../context/ToastContext';

const typeStyles: Record<ToastType, { bg: string; border: string; accent: string; icon: string }> = {
  success: { bg: C.okDim, border: 'rgba(16,185,129,0.3)', accent: C.ok, icon: '\u2705' },
  warning: { bg: C.warnDim, border: 'rgba(245,158,11,0.3)', accent: C.warn, icon: '\u26A0\uFE0F' },
  info: { bg: C.infoDim, border: 'rgba(59,130,246,0.3)', accent: C.info, icon: '\u2139\uFE0F' },
  error: { bg: C.critDim, border: 'rgba(239,68,68,0.3)', accent: C.crit, icon: '\u274C' },
};

export function ToastNotification() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const ts = typeStyles[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -200 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: ts.bg,
                border: `1px solid ${ts.border}`,
                borderRadius: 8,
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                minWidth: 280,
                maxWidth: 420,
              }}
              onClick={() => removeToast(toast.id)}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ts.icon}</span>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>
                {toast.message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
