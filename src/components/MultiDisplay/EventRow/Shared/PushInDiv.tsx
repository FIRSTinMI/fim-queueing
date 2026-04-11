import { h } from 'preact';
import { PropsWithChildren } from 'preact/compat';
import { motion } from 'motion/react';

export default function PushInDiv(
  { key, className, children }: PropsWithChildren & { key: string, className?: string },
) {
  return (
    <motion.div
      className={className}
      style={{
        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      }}
      key={key}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: '0', opacity: 1 }}
      exit={{ x: '-40%', opacity: 0 }}
      transition={{
        duration: 1,
        ease: 'easeInOut',
        opacity: {
          duration: 0.5,
        },
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '.25em',
      }}
      >
        {children}
      </div>
    </motion.div>
  );
}

PushInDiv.defaultProps = {
  className: undefined,
};
