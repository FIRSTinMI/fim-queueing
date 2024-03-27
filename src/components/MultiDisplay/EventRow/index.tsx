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

const EventRow = ({
  token,
  season,
  showLine,
}: {
  token: string;
  season: string;
  showLine: 0 | 1;
}) => {
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

    const eventRef = ref(getDatabase(), `/seasons/${season}/events/${token}`);
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

    if (matchNumber === null || matchNumber === undefined) {
      if (dbEventRef.current === undefined) return; // throw new Error('No event ref');
      // update(dbEventRef.current, {
      //   currentMatchNumber: 1,
      // }).catch((e) => {
      //   console.error(e);
      // });
      return;
    }

    try {
      // Make a new array of max queuing matches to display
      const maxQ =
        typeof e.options?.maxQueueingToShow === 'number'
          ? e.options?.maxQueueingToShow
          : 3;
      const toFill = new Array(maxQ).fill(null);
      toFill.forEach((_, i) => {
        toFill[i] = i + 2;
      });

      const data = {
        currentMatch: getMatchByNumber(matchNumber),
        nextMatch: getMatchByNumber(matchNumber + 1),
        // By default, we'll take the three matches after the one on deck
        queueingMatches: toFill
          .map((x) => getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as QualMatch[],
      };

      setDisplayMatches(data);
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

  const getRedStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Red1} ${match.participants.Red2} ${match.participants.Red3}`;
  };

  const getBlueStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Blue1} ${match.participants.Blue2} ${match.participants.Blue3}`;
  };

  return (
    <>
      {loadingState === 'loading' && (
        <div className={styles.infoText}>Loading matches...</div>
      )}
      {loadingState === 'error' && (
        <div className={styles.infoText}>Failed to fetch matches</div>
      )}
      {loadingState === 'ready' && !qualMatches?.length && (
        <div className={styles.infoText}>
          Waiting for schedule to be posted...
        </div>
      )}
      {loadingState === 'ready' && qualMatches?.length !== 0 && (
        <tr style={{ height: '22vh' }}>
          {/* Sponsor Logo */}
          <td>
            <img
              src={event.sponsorLogoUrl}
              alt={event.name}
              className={styles.sponsorLogo}
            />
          </td>

          {/* Current Match */}
          <td className={styles.matchNumber}>{currentMatch?.number}</td>

          {/* Next Match */}
          <td className={styles.textCenter}>
            {nextMatch && (
              <Fragment>
                <span className={styles.matchNumber}>{nextMatch?.number}</span>
                <TextFader
                  red={getRedStr(nextMatch)}
                  blue={getBlueStr(nextMatch)}
                  showLine={showLine}
                />
              </Fragment>
            )}
          </td>

          {/* Queueing Matches */}
          <td>
            {queueingMatches.map((x, i) => (
              <div
                className={styles.flexRow}
                style={{
                  borderBottom:
                    i < queueingMatches.length - 1
                      ? 'solid black 3px'
                      : undefined,
                }}
              >
                <span className={styles.bold}>{x.number} -</span>
                <TextFader
                  red={getRedStr(x)}
                  blue={getBlueStr(x)}
                  showLine={showLine}
                />
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
};

const TextFader = ({
  red,
  blue,
  showLine,
}: {
  red: string;
  blue: string;
  showLine: 0 | 1;
}) => {
  return (
    <div className={styles.faderBase}>
      <div
        className={styles.red}
        style={{
          opacity: showLine ? 0 : 1,
        }}
      >
        R: {red}
      </div>
      <div
        className={styles.blue}
        style={{
          opacity: showLine,
        }}
      >
        B: {blue}
      </div>
    </div>
  );
};

export default EventRow;
