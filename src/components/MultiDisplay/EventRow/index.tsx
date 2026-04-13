import { h } from 'preact';
import {
  DatabaseReference,
  getDatabase,
  ref,
  onValue,
  off,
} from 'firebase/database';
import { useEffect, useState, useRef } from 'preact/hooks';
import { Event } from '@shared/DbTypes';
import QualRow from './QualRow';
import PlayoffRow from './PlayoffRow';
import MessageRow from './MessageRow';
import styles from './sharedStyles.module.scss';

function EventRowDetails({
  event,
  token,
  season,
  showLine,
}: {
  event: Event,
  token: string,
  season: string,
  showLine: 0 | 1 | null,
}) {
  if (event.message) {
    return (<MessageRow event={event} />);
  }
  if (event.state === 'Pending' || event.state === 'AwaitingQualSchedule') {
    return (<MessageRow event={event} overrideMessage="Waiting for schedule to be posted..." />);
  }
  if (event.state === 'QualsInProgress') {
    return (<QualRow event={event} token={token} showLine={showLine} />);
  }
  if (event.state === 'AwaitingAlliances') {
    return (<MessageRow event={event} overrideMessage="Alliance Selection in progress..." />);
  }
  return (<PlayoffRow event={event} season={season} token={token} showLine={showLine} />);
}

function EventRow({
  token,
  season,
  showLine,
}: {
  token: string;
  season: string;
  showLine: 0 | 1 | null;
}) {
  // Ref to the event in the database
  const dbEventRef = useRef<DatabaseReference>();

  // This row's events
  const [event, setEvent] = useState<Event>();

  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

  useEffect(() => {
    if (!token) return () => { };

    const eventRef = ref(getDatabase(), `/seasons/${season}/events/${token}`);
    dbEventRef.current = eventRef;
    onValue(dbEventRef.current, (snap) => {
      setEvent(snap.val() as Event);
    });

    return () => {
      off(eventRef);
    };
  }, [season, token]);

  if (!event) return null;

  return (
    <tr style={{ height: '22vh' }}>
      <td>
        {/* Use event logo */}
        {!useShortName && (
          <img
            src={event.branding?.logo || ''}
            alt={event.name}
            className={styles.sponsorLogo}
          />
        )}

        {/* Use event short name */}
        {useShortName && (
          <div
            className={`${styles.textLeft} ${styles.bold} ${styles.eventName}`}
          >
            {event.nameShort || event.name}
          </div>
        )}
      </td>

      <EventRowDetails event={event} token={token} season={season} showLine={showLine} />
    </tr>
  );
}

export default EventRow;
