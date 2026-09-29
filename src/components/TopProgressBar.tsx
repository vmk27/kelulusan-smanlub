import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TopProgressBarProps {
  isActive: boolean;
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({ isActive }) => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'completing'>('idle');

  useEffect(() => {
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (isActive) {
      setVisible(true);
      setPhase('loading');
    } else if (visible) {
      setPhase('completing');
      hideTimer = setTimeout(() => {
        setVisible(false);
        setPhase('idle');
      }, 240);
    }

    return () => {
      if (finishTimer) clearTimeout(finishTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isActive, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="progressbar"
          aria-label="Memuat dan memverifikasi data"
          aria-busy={isActive}
          className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-palette-accent pointer-events-none overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0.08 }}
            animate={{
              scaleX: phase === 'completing' ? 1 : 0.78,
            }}
            transition={{
              duration: phase === 'completing' ? 0.18 : 1.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="h-full w-full bg-palette-primary origin-left"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
