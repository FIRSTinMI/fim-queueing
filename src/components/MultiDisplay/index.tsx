import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import EventRow from './EventRow';
import styles from './styles.module.scss';

const MultiQueueing = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const events = searchParams.getAll('e');
  const season = searchParams.get('s') ?? new Date().getFullYear().toString();

  const calcClock = (): string => {
    const now = new Date();
    const str = now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return str;
  };

  const [showLine, setShowLine] = useState<0 | 1>(0);
  const [clock, setClock] = useState<string>(calcClock());

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLine((sl: 0 | 1) => (sl === 0 ? 1 : 0));
    }, 5000);

    const clockInterval = setInterval(() => setClock(calcClock()), 60000);
    calcClock();

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <div className={styles.container}>
      <table>
        <thead>
          <tr style={{ textAlign: 'center' }}>
            <th style={{ width: '15vw' }}>{clock}</th>
            <th style={{ width: '18vw' }}>On Field</th>
            <th style={{ width: '32vw' }}>Next Match</th>
            <th style={{ width: '38vw' }}>Queueing Matches</th>
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
