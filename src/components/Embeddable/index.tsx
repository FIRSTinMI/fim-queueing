import { h } from 'preact';
import {
  useContext, useEffect, useRef, useState,
} from 'preact/hooks';
import { memo } from 'preact/compat';

import { Event } from '@shared/DbTypes';
import AppContext from '@/AppContext';
import styles from './styles.module.scss';
import MenuBar from '../MenuBar';

const IFrame = memo(({ src, pointer }: { src: string, pointer: string }) => (
  <iframe width="100%" height="100%" src={src} title="Event Embeddable" style={{ pointerEvents: pointer }} />
));

export type EmbeddableRouteParams = {
  iframeUrl: (season: number, evt: Event) => (string | undefined),
};

type EmbeddableProps = {
  routeParams: EmbeddableRouteParams,
};

const Embeddable = (props: EmbeddableProps) => {
  const { routeParams: { iframeUrl: iframeUrlFn } } = props;
  const appContext = useContext(AppContext);
  const [iframeUrl, setIframeUrl] = useState<string | undefined>(undefined);
  const [pointer, setPointer] = useState('none');
  const pointerTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (appContext?.event && appContext?.season) {
      setIframeUrl(iframeUrlFn(appContext.season, appContext.event));
    }
  }, [appContext?.event]);

  const onClickDiv = () => {
    if (pointerTimeout.current) clearTimeout(pointerTimeout.current);

    setPointer('auto');
    pointerTimeout.current = setTimeout(() => {
      setPointer('none');
    }, 5000);
  };

  let content: JSX.Element;
  if (!iframeUrl) {
    content = (
      <div style={{ textAlign: 'center', paddingTop: '10vh' }}>Error: No URL to embed</div>
    );
  } else {
    content = (
      // These are pretty much false positives, so just don't even bother
      // eslint-disable-next-line max-len
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onClickDiv}>
        <IFrame src={iframeUrl} pointer={pointer} />
      </div>
    );
  }

  return (
    <div className={styles.embeddable}>
      <MenuBar event={appContext.event} season={appContext.season} />
      { content }
    </div>
  );
};

export default Embeddable;
