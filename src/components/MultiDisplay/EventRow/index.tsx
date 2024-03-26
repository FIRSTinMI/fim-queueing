import { h, Fragment } from 'preact';
import {
  DatabaseReference,
  getDatabase,
  ref,
  update,
  onValue,
  off,
} from 'firebase/database';
import { useEffect, useState, useRef } from 'preact/hooks';
import { QualMatch } from '@shared/DbTypes';
import styles from './styles.module.scss';
import { Event } from '@shared/DbTypes';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const EventRow = ({ token, season }: { token: string, season: string }) => {
  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  // Ref to the event in the database
  const dbEventRef = useRef<DatabaseReference>();

  // This row's events
  const [event, setEvent] = useState<Event>({} as any);

  // This row's matches
  const [qualMatches, setQualMatches] = useState<QualMatch[]>([]);

  // Matches to display
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: QualMatch | null;
    nextMatch: QualMatch | null;
    queueingMatches: QualMatch[];
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });

  useEffect(() => {
    if (!token) return () => {};

    const eventRef = ref(
      getDatabase(),
      `/seasons/${season}/events/${token}`
    );
    dbEventRef.current = eventRef;
    onValue(dbEventRef.current, (snap) => {
      setEvent(snap.val() as Event);
    });

    const matchesRef = ref(getDatabase(), `/seasons/${season}/qual/${token}`);
    onValue(matchesRef, (snap) => {
      setQualMatches(snap.val() as QualMatch[]);
    });

    return () => {
      off(matchesRef);
      off(eventRef);
    };
  }, [season, token]);

  const getMatchByNumber = (matchNumber: number): QualMatch | null =>
    qualMatches?.find((x) => x.number === matchNumber) ?? null;

  const updateMatches = (e: Event): void => {
    const matchNumber = e.currentMatchNumber;
    console.log('Match number:', matchNumber )

    if (matchNumber === null || matchNumber === undefined) {
      if (dbEventRef.current === undefined) return; // throw new Error('No event ref');
      update(dbEventRef.current, {
        currentMatchNumber: 1,
      }).catch((e) => {
        console.error(e);
      });
      return;
    }

    try {
      setDisplayMatches({
        currentMatch: getMatchByNumber(matchNumber),
        nextMatch: getMatchByNumber(matchNumber + 1),
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4]
          .map((x) => getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as QualMatch[],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  };

  useEffect(() => {
    if (event) updateMatches(event);
  }, [event.currentMatchNumber, qualMatches]);

  const { currentMatch, nextMatch, queueingMatches } = displayMatches;

  return (
    <>
      <div className={styles.fullHeight}>
        {loadingState === 'loading' && (
          <div className={styles.infoText}>Loading matches...</div>
        )}
        {loadingState === 'error' && (
          <div className={styles.infoText}>Failed to fetch matches</div>
        )}
        {loadingState === 'noAutomatic' && (
          <div className={styles.infoText}>
            Unable to run in automatic mode. Press the &apos;a&apos; key to
            switch modes.
          </div>
        )}
        {loadingState === 'ready' && !qualMatches?.length && (
          <div className={styles.infoText}>
            Waiting for schedule to be posted...
          </div>
        )}
        {loadingState === 'ready' && qualMatches?.length !== 0 && (
          <div className={styles.qualsDisplay}>
            <div className={styles.matches}>
              <div className={styles.topBar}>
                {currentMatch && (
                  <div>
                    {/* <MatchDisplay halfWidth match={currentMatch} /> */}
                    <h3>{currentMatch.number}</h3>
                    <span className={styles.description}>On Field</span>
                  </div>
                )}
                {nextMatch && (
                  <div>
                    {/* <MatchDisplay halfWidth match={nextMatch} /> */}
                    <h3>{nextMatch.number}</h3>
                    <span className={styles.description}>On Deck</span>
                  </div>
                )}
              </div>
              {/* {queueingMatches.map((x) => (
                <MatchDisplay
                  className={styles.queueingMatches}
                  match={x}
                  key={x.number}
                />
              ))} */}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EventRow;
