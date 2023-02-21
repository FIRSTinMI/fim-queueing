import { h } from 'preact';
import { useContext, useRef, useState } from 'preact/hooks';
import { memo } from 'preact/compat';

import styles from './styles.scss';
import AppContext from '../../AppContext';
import MenuBar from '../MenuBar';

const StreamIFrame = memo(({ src, pointer }: { src: string, pointer: string }) => (
  <iframe width="100%" height="100%" src={src} title="Event Live Stream" style={{ pointerEvents: pointer }} />
));

const LiveStream = () => {
  const appContext = useContext(AppContext);
  const [pointer, setPointer] = useState('none');
  const pointerTimeout = useRef<ReturnType<typeof setTimeout>>();

  const onClickDiv = () => {
    if (pointerTimeout.current) clearTimeout(pointerTimeout.current);

    setPointer('auto');
    pointerTimeout.current = setTimeout(() => {
      setPointer('none');
    }, 5000);
  };

  let content: JSX.Element;
  if (!appContext.event?.streamEmbedLink) {
    content = (
      <div style={{ textAlign: 'center', paddingTop: '10vh' }}>Error: Unable to determine live stream location...</div>
    );
  } else {
    content = (
      // These are pretty much false positives, so just don't even bother
      // eslint-disable-next-line max-len
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onClickDiv}>
        <StreamIFrame src={appContext.event.streamEmbedLink} pointer={pointer} />
      </div>
    );
  }

  return (
    <div className={styles.liveStream}>
      <MenuBar event={appContext.event} season={appContext.season} />
      { content }
    </div>
  );
};

export default LiveStream;
