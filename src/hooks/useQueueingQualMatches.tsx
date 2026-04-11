import { QualMatch, QualBreak, Event } from '@shared/DbTypes';
import {
  useContext, useEffect, useRef, useState,
} from 'preact/hooks';
import {
  DatabaseReference, getDatabase, off, onValue, ref, update,
} from 'firebase/database';
import AppContext from '@/AppContext';

export type UseQueueingQualMatchesProps = {
  token?: string, // uses token from context if undefined
  numQueueing: number
};

export type QueueingQualMatches = {
  state: 'loading' | 'error' | 'ready',
  now: QualMatch | QualBreak | null,
  next: QualMatch | QualBreak | null,
  queueing: (QualMatch | QualBreak)[] | null
};

export default function useQueueingQualMatches(props: UseQueueingQualMatchesProps)
  : QueueingQualMatches {
  const { token: ctxToken, season } = useContext(AppContext);
  const dbEventRef = useRef<DatabaseReference>();
  const [event, setEvent] = useState<Event | null>(null);
  const [qualMatches, setQualMatches] = useState<(QualMatch | QualBreak)[]>([]);
  const [displayMatches, setDisplayMatches] = useState<QueueingQualMatches>({
    state: 'loading',
    now: null,
    next: null,
    queueing: null,
  });
  const token = props.token ?? ctxToken;

  useEffect(() => {
    if (!token || !season) return () => {};

    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);
    onValue(dbEventRef.current, (snap) => {
      setEvent(snap.val() as Event);
    });

    const matchesRef = ref(getDatabase(), `/seasons/${season}/qual/${token}`);
    onValue(matchesRef, (snap) => {
      setQualMatches([...snap.val() as (QualMatch | QualBreak)[], { type: 'break', description: '(END)' }]);
    });

    return () => {
      off(matchesRef);
    };
  }, [season, token]);

  const getMatchIdxByNumber = (matchNumber: number): number | null => {
    const res = qualMatches?.findIndex(
      (x) => x.type !== 'break' && x.number === matchNumber,
    ) ?? null;

    if (res === null || res === -1) return null;

    return res;
  };

  const getMatchByIndex = (index: number | null): QualMatch | QualBreak | null => (
    index !== null && qualMatches
      ? (qualMatches[index] ?? null)
      : null);

  const updateMatches = (): void => {
    if (!event) return;
    const matchNumber = event?.currentMatchNumber;

    if (matchNumber === null || matchNumber === undefined) {
      if (dbEventRef.current === undefined) return;
      console.log('setting match number to 1');
      update(dbEventRef.current, {
        currentMatchNumber: 1,
      });
      return;
    }

    try {
      const currentIdx = getMatchIdxByNumber(matchNumber);
      if (currentIdx !== null) {
        setDisplayMatches({
          state: 'ready',
          now: getMatchByIndex(currentIdx),
          next: getMatchByIndex(currentIdx + 1),
          queueing: Array(props.numQueueing).fill(2)
            .map((e, i) => e + i)
            .map((x) => getMatchByIndex(currentIdx + x))
            .filter((x) => x !== null) as (QualMatch | QualBreak)[],
        });
      } else {
        setDisplayMatches({
          state: 'ready',
          now: null,
          next: null,
          queueing: [],
        });
      }
    } catch (e) {
      setDisplayMatches((val) => ({
        ...val,
        state: 'error',
      }));
      console.error(e);
    }
  };

  useEffect(() => {
    updateMatches();
  }, [event?.currentMatchNumber, qualMatches]);

  return displayMatches;
}
