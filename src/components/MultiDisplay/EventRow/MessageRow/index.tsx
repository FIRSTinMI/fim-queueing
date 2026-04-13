import { h } from 'preact';
import { Event } from '@shared/DbTypes';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';
import { AnimatePresence } from 'motion/react';
import styles from './styles.module.scss';
import PushInDiv from '../Shared/PushInDiv';

function MessageRow({ event, overrideMessage }: { event: Event, overrideMessage?: string }) {
  const effectiveMessage = overrideMessage || event.message || event.name;
  return (
    <td colSpan={3}>
      <div className={styles.messageText} style={{ position: 'relative', paddingLeft: '5vw', paddingRight: '2vw' }}>
        <AnimatePresence>
          <PushInDiv key={effectiveMessage}>
            <Textfit
              style={{ width: '100%', height: '22vh' }}
              mode="single"
              forceSingleModeWidth
              max={150}
              key={effectiveMessage}
            >
              {effectiveMessage}
            </Textfit>
          </PushInDiv>
        </AnimatePresence>
      </div>
    </td>
  );
}

MessageRow.defaultProps = {
  overrideMessage: undefined,
};

export default MessageRow;
