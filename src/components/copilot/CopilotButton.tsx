
import { motion } from 'framer-motion';
import { C } from '../../config/colors';

interface CopilotButtonProps {
  onClick: () => void;
}

export function CopilotButton({ onClick }: CopilotButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'fixed',
        right: 64,
        bottom: 64,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: C.accent,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 20px rgba(14, 165, 160, 0.4)`,
        zIndex: 50,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.bg}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </motion.button>
  );
}
