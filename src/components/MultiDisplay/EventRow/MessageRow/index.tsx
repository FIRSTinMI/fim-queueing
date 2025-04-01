import { h } from 'preact';
import { Event } from '@shared/DbTypes';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';
import styles from './styles.module.scss';

const MessageRow = ({ event, showLine }: { event: Event; showLine: 0 | 1 | null }) => (
  <div
    className={styles.messageContainer}
    style={event.message ? { left: 0 } : {}}
  >
    <div
      className={styles.messageMover}
      style={{
        color: event.branding?.textColor,
        backgroundColor: event.branding?.bgColor,
      }}
    >
      {/* Logo/Event Name Short Fader */}
      <div className={styles.faderContainer}>
        {/* Logo */}
        <div style={{ opacity: showLine !== null && !event.branding?.logo ? 0 : showLine }}>
          <img
            src={event.branding?.logo}
            alt={event.name}
            className={styles.sponsorLogo}
          />
        </div>
        {/* Text */}
        <span
          className={`${styles.textCenter} ${styles.bold}`}
          // eslint-disable-next-line no-nested-ternary
          style={{ opacity: (showLine === null || !event.branding?.logo) ? 1 : showLine ? 0 : 1 }}
        >
          <Textfit
            mode="single"
            forceSingleModeWidth={false}
            max="300"
            style={{ height: '22vh', width: '25vw' }}
          >
            {event.nameShort || event.name}
          </Textfit>
        </span>
      </div>

      {/* Message */}
      <span className={styles.messageText}>
        <Textfit mode="single" forceSingleModeWidth max="300">
          {event.message || event.name}
        </Textfit>
      </span>
    </div>
  </div>
);

export default MessageRow;
