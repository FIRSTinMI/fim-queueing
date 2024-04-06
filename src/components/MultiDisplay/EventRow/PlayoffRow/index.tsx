import { h, Fragment } from 'preact';
import { Event, PlayoffMatch } from '@shared/DbTypes';
import {
  getDatabase,
  ref,
  onValue,
  off,
  // update,
} from 'firebase/database';
// @ts-ignore
import { Textfit } from '@gmurph91/react-textfit';
import { useEffect, useState } from 'preact/hooks';
import DoubleEliminationBracketMapping, {
  BracketMatchNumber,
} from '@shared/DoubleEliminationBracketMapping';
import styles from '../sharedStyles.module.scss';
import { PlayoffMatchData } from '@/models/MatchData';
import MessageRow from '../MessageRow';
import { PlayoffMatchDisplay } from '@/components/PlayoffQueueing/PlayoffMatchDisplay';
import AllianceFader from '../AllianceFader';
import getGenericText from '@/util/getGenericText';

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
  const [results, setResults] = useState<Partial<Record<BracketMatchNumber, PlayoffMatch>>>({});

  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

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
      `/seasons/${season}/bracket/${token}`,
    );
    onValue(bracketRef, (snap) => {
      setResults(
        snap.val() as Partial<Record<BracketMatchNumber, PlayoffMatch>>,
      );
    });

    return () => {
      off(bracketRef);
    };
  }, [season]);

  /**
   * (Re)populate the match displays with latest data and calculate the current + next matches
   */
  const updateMatches = (e: Event): void => {
    // Get the basic list of matches
    // eslint-disable-next-line max-len
    const matchDisplays: PlayoffMatchDisplay[] = DoubleEliminationBracketMapping.matches.map((m) => ({
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
    let currentMatchIndex = matchDisplays.reduce((v, m, i) => (m.result?.winner ? i : v), -1) + 1;
    console.log(currentMatchIndex);

    // We have no way of knowing when a break is over, so to reduce confusion never show a break
    // as the current match. If we're at the end of the matches we can show that
    if (
      matchDisplays[currentMatchIndex].customDisplayText
      && matchDisplays.length - 1 > currentMatchIndex
    ) {
      currentMatchIndex += 1;
    }

    // Make a new array of max queuing matches to display
    const maxQ = typeof e.options?.maxQueueingToShow === 'number'
      ? e.options?.maxQueueingToShow
      : 3;

    const toFill = new Array(maxQ).fill(null);
    toFill.forEach((_, i) => {
      toFill[i] = i + 2;
    });

    console.log(matchDisplays[currentMatchIndex]);
    console.log(matchDisplays[currentMatchIndex + 1]);
    console.log(toFill.map((x) => matchDisplays[currentMatchIndex + x]));

    try {
      setDisplayMatches({
        currentMatch: matchDisplays[currentMatchIndex],
        nextMatch: matchDisplays[currentMatchIndex + 1],
        // By default, we'll take the three matches after the one on deck
        queueingMatches: toFill
          .map((x) => matchDisplays[currentMatchIndex + x])
          .filter((x) => x !== undefined) as PlayoffMatchDisplay[],
      });
      setLoadingState('ready');
    } catch (err) {
      setLoadingState('error');
      console.error(err);
    }
  };

  // FIXME (@evanlihou): This effect runs twice on initial load, which causes the "waiting for
  // schedule to be posted" message to flash on the screen for one rendering cycle
  useEffect(() => {
    updateMatches(event);
  }, [results]);

  // Spread the match data
  const { currentMatch, nextMatch, queueingMatches } = displayMatches;

  // Get the display text from a playoff match
  const getDisplayText = (match: PlayoffMatchDisplay): string => {
    if (match.customDisplayText) {
      return match.customDisplayText;
    }

    return match.num === 'F' ? 'F' : `M${match.num}`;
  };

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
                <span className={styles.matchNumber} style={{ fontSize: !nextMatch?.match ? '7vw' : undefined }}>
                  {getDisplayText(nextMatch)}
                </span>
                <span className={styles.nextMatchScroll}>
                  {nextMatch?.match && (
                    <AllianceFader
                      red={getGenericText(nextMatch?.match?.participants?.red)}
                      blue={getGenericText(nextMatch?.match?.participants?.blue)}
                      showLine={showLine}
                    />
                  )}
                </span>
              </Fragment>
            )}
          </td>

          {/* Queueing Matches */}
          <td className={styles.textCenter}>
            {/* Multiple Queueing Matches */}
            {queueingMatches.length > 1
              && queueingMatches.map((x) => (
                <div className={styles.flexRow}>
                  <span className={styles.bold} style={{ fontSize: !x?.match ? '7vw' : undefined }}>
                    {getDisplayText(x)}
                  </span>
                  {x?.match && (
                    <AllianceFader
                      red={getGenericText(x?.match?.participants?.red)}
                      blue={getGenericText(x?.match?.participants?.blue)}
                      showLine={showLine}
                    />
                  )}
                </div>
              ))}

            {/* Single Queueing Match */}
            {queueingMatches.length === 1 && queueingMatches[0] && (
              <>
                {queueingMatches[0] && (
                  <Fragment>
                    <span className={styles.matchNumber} style={{ fontSize: !queueingMatches[0]?.match ? '7vw' : undefined }}>
                      {getDisplayText(queueingMatches[0])}
                    </span>
                    <span>
                      {queueingMatches[0]?.match && (
                        <AllianceFader
                          red={getGenericText(queueingMatches[0]?.match?.participants?.red)}
                          blue={getGenericText(queueingMatches[0]?.match?.participants?.blue)}
                          showLine={showLine}
                        />
                      )}
                    </span>
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
