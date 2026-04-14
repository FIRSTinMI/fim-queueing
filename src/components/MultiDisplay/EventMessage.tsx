import { AnimatePresence, motion } from 'motion/react';
import { h } from 'preact';
import messageBackground from '../../assets/messageBackground_26msc.png';

function EventMessage({ message, clock }: { message: string | null | undefined, clock: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100vh',
            width: '100vw',
            background: 'white',
            color: 'black',
            zIndex: 20,
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0', opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
            opacity: {
              duration: 0.5,
            },
          }}
        >
          <img style={{ marginTop: '2vh' }} src={messageBackground} alt="" />
          <div
            style={{
              position: 'absolute',
              fontWeight: 700,
              fontFamily: 'Roboto',
              top: '0',
              left: '0',
              width: '100vw',
              height: '11vh',
              paddingLeft: '10vw',
              background: 'black',
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '11vh',
            }}
          >
            <span>{clock}</span>
          </div>
          <div
            style={{
              position: 'absolute',
              fontWeight: 700,
              fontFamily: 'Roboto',
              top: '65vh',
              left: '10vw',
              width: '90vw',
              height: '30vh',
              textAlign: 'center',
              fontSize: '10vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EventMessage;
