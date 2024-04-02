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
import styles from './styles.module.scss';
import AllianceFader from './AllianceFader';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

type Break = {
  after: number;
  level: 'qual';
  message: string;
};

type MatchOrBreak = QualMatch | Break | null;

type MatchData = {
  currentMatch: MatchOrBreak | null;
  nextMatch: MatchOrBreak | null;
  queueingMatches: MatchOrBreak[];
};

const EventRow = ({
  token,
  season,
  showLine,
}: {
  token: string;
  season: string;
  showLine: 0 | 1;
}) => {
  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  // Ref to the event in the database
  const dbEventRef = useRef<DatabaseReference>();

  // This row's events
  const [event, setEvent] = useState<Event>({} as any);

  // This row's matches
  const [qualMatches, setQualMatches] = useState<QualMatch[]>([]);

  // This row's breaks
  const [breaks, setBreaks] = useState<Break[]>([]);

  // Matches to display
  // eslint-disable-next-line max-len
  const [displayMatches, setDisplayMatches] = useState<MatchData>({
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

    const matchesRef = ref(getDatabase(), `/seasons/${season}/qual/${token}`);
    onValue(matchesRef, (snap) => {
      setQualMatches(snap.val() as QualMatch[]);
    });

    const breaksRef = ref(getDatabase(), `/seasons/${season}/breaks/${token}`);
    onValue(breaksRef, (snap) => {
      setBreaks(snap.val() as Break[]);
    });

    return () => {
      off(matchesRef);
      off(eventRef);
    };
  }, [season, token]);

  // eslint-disable-next-line max-len -- HOW TO MAKE THIS SHORT?
  const getMatchByNumber = (matchNumber: number): QualMatch | null =>
    qualMatches?.find((x) => x.number === matchNumber) ?? null;

  const updateMatches = (e: Event): void => {
    const matchNumber = e.currentMatchNumber;

    if (matchNumber === null || matchNumber === undefined) {
      if (dbEventRef.current === undefined) return; // throw new Error('No event ref');
      // update(dbEventRef.current, {
      //   currentMatchNumber: 1,
      // }).catch((err) => {
      //   console.error(err);
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

      // Upcoming matches
      const upcoming: MatchOrBreak[] = [
        getMatchByNumber(matchNumber),
        getMatchByNumber(matchNumber + 1),
      ].concat(
        // Add Queueing Matches
        toFill
          .map((x) => getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as QualMatch[]
      );

      // See if there is an upcoming break
      breaks?.forEach((b: Break) => {
        // See if break start is inside what we're showing
        if (b.after < matchNumber + upcoming.length) {
          // Calculate the insert location
          const insertAt = b.after - matchNumber;
          // Sanity
          if (insertAt < 0) return;
          // Insert break
          upcoming.splice(insertAt, 0, b);
          // Remove one from the end
          upcoming.pop();
        }
      });

      const data = {
        currentMatch: upcoming[0],
        nextMatch: upcoming[1],
        queueingMatches: upcoming.slice(2),
      } as MatchData;

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
  }, [event.currentMatchNumber, qualMatches, breaks]);

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
            <span>
              <b>{event.name}</b>
              <br />
            </span>
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
            <span>
              <b>{event.name}</b>
              <br />
            </span>
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
            <span>
              <b>{event.name}</b>
              <br />
            </span>
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
        {/* Message */}
        <div
          className={styles.messageContainer}
          style={event.message ? { left: 0 } : {}}
        >
          <div
            className={styles.messageMover}
            style={{
              color: event.branding?.textColor,
              backgroundColor: event.branding?.bgColor,
            }}
          >
            {/* Logo/Event Name Short Fader */}
            <div className={styles.faderContainer}>
              {/* Logo */}
              <div style={{ opacity: showLine }}>
                <img
                  src={event.branding?.logo}
                  alt={event.name}
                  className={styles.sponsorLogo}
                />
              </div>
              {/* Text */}
              <span
                className={styles.textCenter + ' ' + styles.bold}
                style={{ opacity: !!showLine ? 0 : 1 }}
              >
                <Textfit
                  mode="single"
                  forceSingleModeWidth={false}
                  max="300"
                  style={{ height: '22vh' }}
                >
                  {event.nameShort || event.name}
                </Textfit>
              </span>
            </div>

            {/* Message */}
            <span className={styles.textCenter + ' ' + styles.bold}>
              <Textfit mode="single" forceSingleModeWidth={true} max="300">
                {event.message || event.name}
              </Textfit>
            </span>
          </div>
        </div>

        <tr style={{ height: '22vh' }}>
          {/* Field Name / Logo */}
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
                className={styles.textCenter + ' ' + styles.bold}
                style={{ width: '15vw' }}
              >
                <Textfit mode="single" forceSingleModeWidth={true} max="300">
                  {event.nameShort || event.name}
                </Textfit>
              </div>
            )}
          </td>

          {/* Current Match */}
          {currentMatch && (currentMatch as QualMatch)?.number && (
            <td className={styles.matchNumber}>
              {(currentMatch as QualMatch)?.number}
            </td>
          )}

          {/* Current Match is Break */}
          {currentMatch && (currentMatch as Break)?.message && (
            <td className={styles.textCenter}>
              {(currentMatch as Break)?.message}
            </td>
          )}

          {/* Next Match */}
          <td className={styles.textCenter}>
            {/* Is a Match */}
            {nextMatch && (nextMatch as QualMatch).number && (
              <Fragment>
                <span className={styles.matchNumber}>
                  {(nextMatch as QualMatch)?.number}
                </span>
                <span className={styles.nextMatchScroll}>
                  <AllianceFader
                    red={getRedStr(nextMatch as QualMatch)}
                    blue={getBlueStr(nextMatch as QualMatch)}
                    showLine={showLine}
                  />
                </span>
              </Fragment>
            )}

            {/* Is a Break */}
            {nextMatch && (nextMatch as Break).message && (
              <Fragment>{(nextMatch as Break).message}</Fragment>
            )}
          </td>

          {/* Queueing Matches */}
          <td className={styles.textCenter}>
            {/* Multiple Queueing Matches */}
            {queueingMatches.length > 1 &&
              queueingMatches.map((x) => {
                // Is a match, not a break
                if (x && (x as QualMatch).number) {
                  const match = x as QualMatch;
                  return (
                    <div className={styles.flexRow}>
                      <span className={styles.bold}>{match.number} -</span>
                      <AllianceFader
                        red={getRedStr(match)}
                        blue={getBlueStr(match)}
                        showLine={showLine}
                      />
                    </div>
                  );
                }

                // Is a break
                return (
                  <div className={styles.textCenter}>
                    {(x as Break).message}
                  </div>
                );
              })}

            {/* Single Queueing Match */}
            {queueingMatches.length === 1 && queueingMatches[0] && (
              <>
                {queueingMatches[0] &&
                  (queueingMatches[0] as QualMatch).number && (
                    <Fragment>
                      <span className={styles.matchNumber}>
                        {(queueingMatches[0] as QualMatch)?.number}
                      </span>
                      <span>
                        <AllianceFader
                          red={getRedStr(queueingMatches[0] as QualMatch)}
                          blue={getBlueStr(queueingMatches[0] as QualMatch)}
                          showLine={showLine}
                        />
                      </span>
                    </Fragment>
                  )}

                {/* Is a Break */}
                {nextMatch && (queueingMatches[0] as Break).message && (
                  <Fragment>{(queueingMatches[0] as Break).message}</Fragment>
                )}
              </>
            )}
          </td>
        </tr>
      </>
    );
  }

  return null;
};

export default EventRow;
