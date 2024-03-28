import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import EventRow from './EventRow';

const MultiQueueing = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const events = searchParams.getAll('e');
  const season = searchParams.get('s') ?? new Date().getFullYear().toString();

  const [showLine, setShowLine] = useState<0 | 1>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLine((sl: 0 | 1) => (sl === 0 ? 1 : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <table>
        <thead>
          <tr style={{ textAlign: 'center' }}>
            <th>Field</th>
            <th style={{ width: '20vw' }}>Current Match</th>
            <th style={{ width: '30vw' }}>Next Match</th>
            <th style={{ width: '32vw' }}>Queueing Matches</th>
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
