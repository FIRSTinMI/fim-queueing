import { h, Fragment } from 'preact';
import {
  DatabaseReference,
  getDatabase,
  ref,
  onValue,
  off,
} from 'firebase/database';
import { useEffect, useState, useRef } from 'preact/hooks';
import { QualMatch, Event } from '@shared/DbTypes';
import styles from './styles.module.scss';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const TextFader = ({
  red,
  blue,
  showLine,
}: {
  red: string;
  blue: string;
  showLine: 0 | 1;
}) => (
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
    if (!token) return () => { };

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

  // eslint-disable-next-line max-len -- HOW TO MAKE THIS SHORT?
  const getMatchByNumber = (matchNumber: number): QualMatch | null => qualMatches?.find((x) => x.number === matchNumber) ?? null;

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
      const maxQ = typeof e.options?.maxQueueingToShow === 'number'
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
    } catch (err: any) {
      setLoadingState('error');
      console.error(err);
    }
  };

  // On event change, check for matches
  useEffect(() => {
    if (event) updateMatches(event);
  }, [event.currentMatchNumber, qualMatches]);

  const { currentMatch, nextMatch, queueingMatches } = displayMatches;

  // Calculate Red alliance string
  const getRedStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Red1} ${match.participants.Red2} ${match.participants.Red3}`;
  };

  // Calculate Blue alliance string
  const getBlueStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Blue1} ${match.participants.Blue2} ${match.participants.Blue3}`;
  };

  // Ready w/ no matches
  if (loadingState === 'ready' && (qualMatches?.length ?? 0) < 1) {
    return (
      <tr>
        <td colSpan={4} className={styles.textCenter}>
          {event && event.name && (
            <span><b>{event.name}</b><br /></span>
          )}
          <span>Waiting for schedule to be posted...</span>
        </td>
      </tr>
    );
  }

  // Loading
  if (loadingState === 'loading') {
    return (
      <tr>
        <td colSpan={4} className={styles.textCenter}>
          {event && event.name && (
            <span><b>{event.name}</b><br /></span>
          )}
          <span>Loading matches...</span>
        </td>
      </tr>
    );
  }

  // Error
  if (loadingState === 'error') {
    return (
      <tr>
        <td colSpan={4} className={styles.textCenter}>
          {event && event.name && (
            <span><b>{event.name}</b><br /></span>
          )}
          <span>Failed to fetch matches</span>
        </td>
      </tr>
    );
  }

  // Ready and we have matches
  if (loadingState === 'ready' && qualMatches?.length !== 0) {
    return (
      <>
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
                <span className={styles.nextMatchScroll}>
                  <TextFader
                    red={getRedStr(nextMatch)}
                    blue={getBlueStr(nextMatch)}
                    showLine={showLine}
                  />
                </span>
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
      </>
    );
  }

  return null;
};

export default EventRow;
