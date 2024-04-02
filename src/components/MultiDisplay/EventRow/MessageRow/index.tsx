import { h } from 'preact';
import { Event } from '@shared/DbTypes';
import styles from './styles.module.scss';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';

const MessageRow = ({ event, showLine }: { event: Event; showLine: 0 | 1 }) => {
  return (
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
          <div style={{ opacity: !event.branding?.logo ? 0 : showLine }}>
            <img
              src={event.branding?.logo}
              alt={event.name}
              className={styles.sponsorLogo}
            />
          </div>
          {/* Text */}
          <span
            className={styles.textCenter + ' ' + styles.bold}
            style={{ opacity: !event.branding?.logo ? 1 : !!showLine ? 0 : 1 }}
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
          <Textfit mode="single" forceSingleModeWidth={true} max="300">
            {event.message || event.name}
          </Textfit>
        </span>
      </div>
    </div>
  );
};

export default MessageRow;
