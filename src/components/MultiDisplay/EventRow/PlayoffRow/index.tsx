import { h, Fragment } from 'preact';
import { QualMatch, Event, PlayoffMatch } from '@shared/DbTypes';
import {
  getDatabase,
  ref,
  onValue,
  off,
  // update,
} from 'firebase/database';
import styles from '../sharedStyles.module.scss';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';
import { Break, MatchOrBreak, PlayoffMatchData } from '@/models/MatchData';
import AllianceFader from '../AllianceFader';
import { useEffect, useState } from 'react';
import MessageRow from '../MessageRow';
import DoubleEliminationBracketMapping, {
  BracketMatchNumber,
} from '@shared/DoubleEliminationBracketMapping';
import { PlayoffMatchDisplay } from '@/components/PlayoffQueueing/PlayoffMatchDisplay';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const PlayoffRow = ({
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
  const [results, setResults] = useState<
    Partial<Record<BracketMatchNumber, PlayoffMatch>>
  >({});

  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

  // This row's breaks
  const [breaks, setBreaks] = useState<Break[]>([]);

  // Matches to display
  // eslint-disable-next-line max-len
  const [displayMatches, setDisplayMatches] = useState<PlayoffMatchData>({
    currentMatch: null,
    nextMatch: null,
    queueingMatches: [],
  });

  useEffect(() => {
    const bracketRef = ref(
      getDatabase(),
      `/seasons/${season}/bracket/${token}`
    );
    onValue(bracketRef, (snap) => {
      setResults(
        snap.val() as Partial<Record<BracketMatchNumber, PlayoffMatch>>
      );
    });

    return () => {
      off(bracketRef);
    };
  }, [season]);

  /**
   * (Re)populate the match displays with latest data and calculate the current + next matches
   */
  const updateMatches = (): void => {
    // Get the basic list of matches
    const matchDisplays: PlayoffMatchDisplay[] =
      DoubleEliminationBracketMapping.matches.map((m) => ({
        result: results ? results[m.number] ?? null : null,
        match: m,
        num: m?.number,
      }));
    // TODO: Find a better way to do this?
    // TODO: Add multiple entries for finals with break between?

    // Add in the breaks
    DoubleEliminationBracketMapping.breakAfter.forEach((b) => {
      matchDisplays.splice(matchDisplays.findIndex((m) => m.num === b) + 1, 0, {
        result: null,
        match: null,
        num: null,
        customDisplayText: '(Break)',
      });
    });

    matchDisplays.push({
      result: null,
      match: null,
      num: null,
      customDisplayText: '(END)',
    });

    // Get the last match that has a winner
    let currentMatchIndex =
      matchDisplays.reduce((v, m, i) => (m.result?.winner ? i : v), -1) + 1;
    console.log(currentMatchIndex);

    // We have no way of knowing when a break is over, so to reduce confusion never show a break
    // as the current match. If we're at the end of the matches we can show that
    if (
      matchDisplays[currentMatchIndex].customDisplayText &&
      matchDisplays.length - 1 > currentMatchIndex
    ) {
      currentMatchIndex += 1;
    }

    try {
      setDisplayMatches({
        currentMatch: matchDisplays[currentMatchIndex],
        nextMatch: matchDisplays[currentMatchIndex + 1],
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4]
          .map((x) => matchDisplays[currentMatchIndex + x])
          .filter((x) => x !== undefined) as PlayoffMatchDisplay[],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  };

  // FIXME (@evanlihou): This effect runs twice on initial load, which causes the "waiting for
  // schedule to be posted" message to flash on the screen for one rendering cycle
  useEffect(() => {
    updateMatches();
  }, [results]);

  // Calculate Red alliance string
  const getRedStr = (match: PlayoffMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Red1} ${match.participants.Red2} ${match.participants.Red3}`;
  };

  // Calculate Blue alliance string
  const getBlueStr = (match: PlayoffMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Blue1} ${match.participants.Blue2} ${match.participants.Blue3}`;
  };

  // Spread the match data
  const { currentMatch, nextMatch, queueingMatches } = displayMatches;

  // Loading/Error Text
  if (['loading', 'error'].includes(loadingState)) {
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
              {loadingState === 'error'
                ? 'Failed to fetch matches'
                : 'Loading Matches...'}
            </span>
          </td>
        </tr>
      </>
    );
  }

  // Ready and we have matches
  if (loadingState === 'ready') {
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
          {currentMatch && (
            <td className={styles.matchNumber}>
              {currentMatch.customDisplayText ?? currentMatch?.num === 'F'
                ? 'F'
                : `M${currentMatch?.num}`}
            </td>
          )}

          {/* Next Match */}
          <td className={styles.textCenter}>
            {/* Is a Match */}
            {nextMatch && (
              <Fragment>
                <span className={styles.matchNumber}>
                  {nextMatch.customDisplayText ?? nextMatch?.num === 'F'
                    ? 'F'
                    : `M${nextMatch?.num}`}
                </span>
                {/* TODO: Reenable when sync doesnt suck?
                <span className={styles.nextMatchScroll}>
                  <AllianceFader
                    red={getRedStr(nextMatch)}
                    blue={getBlueStr(nextMatch)}
                    showLine={showLine}
                  />
                </span> 
                
                */}
              </Fragment>
            )}
          </td>

          {/* Queueing Matches */}
          <td className={styles.textCenter}>
            {/* Multiple Queueing Matches */}
            {queueingMatches.length > 1 &&
              queueingMatches.map((x) => {
                return (
                  <div className={styles.flexRow}>
                    <span className={styles.bold}>
                      {x.customDisplayText ?? x?.num === 'F'
                        ? 'F'
                        : `M${x?.num}`}
                    </span>
                    {/* TODO: Reenable when sync doesnt suck? 
                    <AllianceFader
                      red={getRedStr(match)}
                      blue={getBlueStr(match)}
                      showLine={showLine}
                    />
                     */}
                  </div>
                );
              })}

            {/* Single Queueing Match */}
            {queueingMatches.length === 1 && queueingMatches[0] && (
              <>
                {queueingMatches[0] && (
                  <Fragment>
                    <span className={styles.matchNumber}>
                      {queueingMatches[0].customDisplayText ??
                      queueingMatches[0]?.num === 'F'
                        ? 'F'
                        : `M${queueingMatches[0]?.num}`}
                    </span>

                    {/* TODO: Reenable when sync doesnt suck? 
                    <span>
                      <AllianceFader
                        red={getRedStr(queueingMatches[0])}
                        blue={getBlueStr(queueingMatches[0])}
                        showLine={showLine}
                      />
                    </span>
                     */}
                  </Fragment>
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

export default PlayoffRow;
