import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import EventRow from './EventRow';
import styles from './styles.module.scss';
import sharedStyles from './EventRow/sharedStyles.module.scss';

const MultiQueueing = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const events = searchParams.getAll('e');
  const season = searchParams.get('s') ?? new Date().getFullYear().toString();
  const showTeamNumbers = searchParams.get('teamNumbers') !== 'false';

  const calcClock = (): string => {
    const now = new Date();
    const str = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return str;
  };

  const [showLine, setShowLine] = useState<0 | 1 | null>(showTeamNumbers ? 0 : null);
  const [clock, setClock] = useState<string>(calcClock());

  useEffect(() => {
    const interval = showTeamNumbers ? setInterval(() => {
      setShowLine((sl: 0 | 1 | null) => (sl === 0 ? 1 : 0));
    }, 5000) : null;

    const clockInterval = setInterval(() => setClock(calcClock()), 10000);
    calcClock();

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [showTeamNumbers]);

  return (
    <div className={[styles.container, showLine === null ? sharedStyles.noTeamNumbers : null].filter((c) => c).join(' ')}>
      <table>
        <thead>
          <tr style={{ textAlign: 'center', fontSize: '7vh' }}>
            <th style={{ width: '22vw', borderRight: '6px solid white' }}>{clock}</th>
            <th style={{ width: '26vw' }}>On Field</th>
            <th style={{ width: '26vw' }}>Up Next</th>
            <th style={{ width: '26vw' }}>Queueing</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <>
              <hr />
              <EventRow
                token={event}
                season={season}
                key={event}
                showLine={showLine}
              />
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MultiQueueing;
