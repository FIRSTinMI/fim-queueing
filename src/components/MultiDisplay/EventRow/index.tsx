import { h, Fragment } from 'preact';
import {
  DatabaseReference,
  getDatabase,
  ref,
  onValue,
  off,
  // update,
} from 'firebase/database';
import { useEffect, useState, useRef } from 'preact/hooks';
import { Event } from '@shared/DbTypes';
import QualRow from './QualRow';
import PlayoffRow from './PlayoffRow';

const EventRow = ({
  token,
  season,
  showLine,
}: {
  token: string;
  season: string;
  showLine: 0 | 1 | null;
}) => {
  // Ref to the event in the database
  const dbEventRef = useRef<DatabaseReference>();

  // This row's events
  const [event, setEvent] = useState<Event>();

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
    <>
      {/* Beginning of Event */}
      {['Pending', 'AwaitingQualSchedule', 'QualsInProgress'].includes(
        event.state,
      ) ? (
        <QualRow
          event={event}
          season={season}
          token={token}
          showLine={showLine}
        />
        ) : (
          <PlayoffRow
            event={event}
            season={season}
            token={token}
            showLine={showLine}
          />
        )}
    </>
  );
};

export default EventRow;
