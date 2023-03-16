import { h, Fragment } from 'preact';
import {
  useContext, useEffect, useRef, useState,
} from 'preact/hooks';
import AppContext, { AppContextType } from '../../AppContext';
import styles from './styles.scss';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const units = {
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

const StaleDataBanner = (): JSX.Element => {
  const context = useContext(AppContext);
  const contextRef = useRef<AppContextType>();
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>();
  const [isShown, setIsShown] = useState<boolean>(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const checkStaleness = () => {
    // When this function runs under the setInterval, it needs access to the most recent context...
    // TODO(@evanlihou): check this again when I have more time
    const ctx = contextRef.current;

    // If the data is more than 20 minutes old
    if (ctx?.event?.lastModifiedMs
      && Date.now() - (20 * units.minute) > ctx.event.lastModifiedMs) {
      // Show the banner
      setIsShown(true);
      const elapsed = ctx.event.lastModifiedMs - Date.now();

      const [unit, val] = Object.entries(units).filter(([u, v]) => Math.abs(elapsed) > v || u === 'second')[0];
      if (Math.abs(elapsed) > val || unit === 'second') {
        setAsOf(rtf.format(Math.round(elapsed / val), unit as any));
      }
      return;
    }
    // Hide the banner
    setIsShown(false);
  };

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    checkStaleness();

    if (!context?.event?.lastModifiedMs) return () => {};
    setInterval(() => {
      checkStaleness();
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [context?.event?.lastModifiedMs]);

  if (context.features?.showStaleDataBanner === false) {
    return <></>;
  }

  if (isShown) {
    return (
      <div className={styles.staleDataBanner}>Data last published {asOf}.</div>
    );
  }

  return <></>;
};

export default StaleDataBanner;
