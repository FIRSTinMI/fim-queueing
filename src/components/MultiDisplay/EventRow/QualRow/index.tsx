import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { QualMatch, Event } from '@shared/DbTypes';
import {
  getDatabase,
  ref,
  onValue,
  off,
  // update,
} from 'firebase/database';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';
import styles from '../sharedStyles.module.scss';
import { Break, MatchOrBreak, QualMatchData } from '@/models/MatchData';
import AllianceFader from '../AllianceFader';
import MessageRow from '../MessageRow';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const QualRow = ({
  event,
  showLine,
  season,
  token,
}: {
  event: Event;
  showLine: 0 | 1;
  season: string;
  token: string;
}) => {
  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  // This row's matches
  const [qualMatches, setQualMatches] = useState<QualMatch[]>([]);

  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

  // This row's breaks
  const [breaks, setBreaks] = useState<Break[]>([]);

  // Matches to display
  // eslint-disable-next-line max-len
  const [displayMatches, setDisplayMatches] = useState<QualMatchData>({
    currentMatch: null,
    nextMatch: null,
    queueingMatches: [],
  });

  useEffect(() => {
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
      off(breaksRef);
    };
  }, [season]);

  // eslint-disable-next-line max-len -- HOW TO MAKE THIS SHORT?
  const getMatchByNumber = (matchNumber: number): QualMatch | null => qualMatches?.find((x) => x.number === matchNumber) ?? null;

  const updateMatches = (e: Event): void => {
    const matchNumber = e.currentMatchNumber;

    // if (matchNumber === null || matchNumber === undefined) {
    //   if (dbEventRef.current === undefined) return; // throw new Error('No event ref');
    //   // TODO: Why does this always set the match to 1 on page load??
    //   // update(dbEventRef.current, {
    //   //   currentMatchNumber: 1,
    //   // }).catch((err) => {
    //   //   console.error(err);
    //   // });
    //   return;
    // }

    // Return if no match number
    if (matchNumber === null || matchNumber === undefined) return;

    try {
      // Make a new array of max queuing matches to display
      const maxQ = typeof e.options?.maxQueueingToShow === 'number'
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
          .filter((x) => x !== null) as QualMatch[],
      );

      // Calculate the max # of matches we should be displaying
      const maxMatches = 2 + maxQ; // current + next + queueing

      // See if there is an upcoming break
      breaks?.forEach((b: Break) => {
        // See if break start is inside what we're showing
        if (b.after < matchNumber + upcoming.length) {
          // Calculate the insert location
          const insertAt = (b.after - matchNumber) + 1;
          // Sanity
          if (insertAt < 0) return;
          // Insert break
          upcoming.splice(insertAt, 0, b);
          // Verify that the array is not too long
          if (upcoming.length > maxMatches) {
            upcoming.splice(maxMatches, upcoming.length - maxMatches);
          }
        }
      });

      const data = {
        currentMatch: upcoming[0],
        nextMatch: upcoming[1],
        queueingMatches: upcoming.slice(2),
      } as QualMatchData;

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

  // Spread the match data
  const { currentMatch, nextMatch, queueingMatches } = displayMatches;

  // Message cases
  const case1 = ['loading', 'error'].includes(loadingState);
  const case2 = loadingState === 'ready' && (qualMatches?.length ?? 0) < 1;

  // Loading/Error Text
  if (case1 || case2) {
    return (
      <>
        {/* Message */}
        <MessageRow event={event} showLine={showLine} />

        {/* Loading */}
        <tr>
          <td colSpan={4} className={styles.textCenter}>
            {event && event.name && (
              <span>
                <b>{event.name}</b>
                <br />
              </span>
            )}
            <span>
              {/* eslint-disable-next-line no-nested-ternary */}
              {loadingState === 'error' && case1
                ? 'Failed to fetch matches'
                : loadingState === 'loading' && !qualMatches?.length
                  ? 'Waiting for schedule to be posted...'
                  : 'Loading Matches...'}
            </span>
          </td>
        </tr>
      </>
    );
  }

  // Ready and we have matches
  if (loadingState === 'ready' && qualMatches?.length !== 0) {
    return (
      <>
        {/* Message */}
        <MessageRow event={event} showLine={showLine} />

        {/* Quals */}
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
                className={`${styles.textCenter} ${styles.bold}`}
                style={{ width: '15vw' }}
              >
                <Textfit mode="single" forceSingleModeWidth max="300">
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
            {queueingMatches.length > 1
              && queueingMatches.map((x) => {
                // Is a match, not a break
                if (x && (x as QualMatch).number) {
                  const match = x as QualMatch;
                  return (
                    <div className={styles.flexRow}>
                      <span className={styles.queueingMatchNumber}>{match.number} -</span>
                      <div style={{ marginLeft: '16vw', position: 'relative', top: '4vh' }}>
                        <AllianceFader
                          red={getRedStr(match)}
                          blue={getBlueStr(match)}
                          showLine={showLine}
                        />
                      </div>
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
                {queueingMatches[0]
                  && (queueingMatches[0] as QualMatch).number && (
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

export default QualRow;
