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
import { QualMatch, Event } from '@shared/DbTypes';
import styles from './sharedStyles.module.scss';
import { Break, MatchOrBreak, QualMatchData } from '@/models/MatchData';
import QualRow from './QualRow';
import MessageRow from './MessageRow';

const EventRow = ({
  token,
  season,
  showLine,
}: {
  token: string;
  season: string;
  showLine: 0 | 1;
}) => {
  // Ref to the event in the database
  const dbEventRef = useRef<DatabaseReference>();

  // This row's events
  const [event, setEvent] = useState<Event>({} as any);

  // Matches to display
  // eslint-disable-next-line max-len
  const [qualDisplayMatches, setQualDisplayMatches] = useState<QualMatchData>({
    currentMatch: null,
    nextMatch: null,
    queueingMatches: [],
  });

  useEffect(() => {
    if (!token) return () => {};

    const eventRef = ref(getDatabase(), `/seasons/${season}/events/${token}`);
    dbEventRef.current = eventRef;
    onValue(dbEventRef.current, (snap) => {
      setEvent(snap.val() as Event);
    });

    return () => {
      off(eventRef);
    };
  }, [season, token]);

  return (
    <>
      {['Pending', 'AwaitingQualSchedule', 'QualsInProgress'].includes(
        event.state
      ) && (
        <QualRow
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
