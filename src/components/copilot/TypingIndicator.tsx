
import { motion } from 'framer-motion';
import { C } from '../../config/colors';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1" style={{ padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.accent,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}
