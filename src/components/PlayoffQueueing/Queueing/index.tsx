import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, child, ref, update, onValue, off,
} from 'firebase/database';
import { useContext, useEffect, useState } from 'preact/hooks';

import DoubleEliminationBracketMapping, { BracketMatchNumber } from '@shared/DoubleEliminationBracketMapping';
import { PlayoffMatch } from '@shared/DbTypes';
import AppContext from '@/AppContext';
import MenuBar from '@/components/MenuBar';
import MatchDisplay from '../MatchDisplay';
import styles from './styles.scss';
import { PlayoffMatchDisplay } from '../PlayoffMatchDisplay';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const PlayoffQueueing = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [eventRef, setEventRef] = useState<DatabaseReference>();
  const [results, setResults] = useState<Partial<Record<BracketMatchNumber, PlayoffMatch>>>({});
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: PlayoffMatchDisplay | null,
    nextMatch: PlayoffMatchDisplay | null,
    queueingMatches: PlayoffMatchDisplay[]
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });

  useEffect(() => {
    if (!token) return () => {};

    setEventRef(ref(getDatabase(), `/seasons/${season}/events/${token}`));

    const bracketRef = ref(getDatabase(), `/seasons/${season}/bracket/${token}`);
    onValue(bracketRef, (snap) => {
      setResults(snap.val() as Partial<Record<BracketMatchNumber, PlayoffMatch>>);
    });

    return () => {
      off(bracketRef);
    };
  }, [event.eventCode, season, token]);

  /**
   * (Re)populate the match displays with latest data and calculate the current + next matches
   */
  const updateMatches = (): void => {
    // Get the basic list of matches
    const matchDisplays: PlayoffMatchDisplay[] = DoubleEliminationBracketMapping.matches.map(
      (m) => ({
        result: results[m.number] ?? null,
        match: m,
        num: m.number,
      }),
    );
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
    if (matchDisplays[currentMatchIndex].customDisplayText
        && matchDisplays.length - 1 > currentMatchIndex) {
      currentMatchIndex += 1;
    }

    try {
      setDisplayMatches({
        currentMatch: matchDisplays[currentMatchIndex],
        nextMatch: matchDisplays[currentMatchIndex + 1],
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4].map((x) => matchDisplays[currentMatchIndex + x])
          .filter((x) => x !== undefined) as PlayoffMatchDisplay[],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  };

  const setShowEventName = (value: boolean): void => {
    if (eventRef === undefined) throw new Error('No event ref');
    update(child(eventRef, 'options'), {
      showEventName: value,
    });
  };

  const menuOptions = () => (
    <>
      <label htmlFor="eventNameDisplay">
        Show event name:
        {/* @ts-ignore */}
        <input type="checkbox" checked={event.options?.showEventName ?? false} onInput={(e): void => setShowEventName(e.target.checked)} id="eventNameDisplay" />
      </label>
    </>
  );

  // FIXME (@evanlihou): This effect runs twice on initial load, which causes the "waiting for
  // schedule to be posted" message to flash on the screen for one rendering cycle
  useEffect(() => {
    updateMatches();
  }, [results]);

  const { currentMatch, nextMatch, queueingMatches } = displayMatches;
  return (
    <>
      <MenuBar event={event} season={season} options={menuOptions()} />
      <div className={styles.fullHeight}>
        {loadingState === 'loading' && <div className={styles.infoText}>Loading matches...</div>}
        {loadingState === 'error' && <div className={styles.infoText}>Failed to fetch matches</div>}
        {loadingState === 'ready'
          && (
          <div className={styles.qualsDisplay}>
            <div className={styles.matches}>
              {(event.options?.showEventName ?? false) && (
                <div className={styles.eventName}>{event.name}</div>
              )}
              <div className={styles.topBar}>
                {currentMatch && (
                <div>
                  <MatchDisplay halfWidth match={currentMatch} />
                  <span className={styles.description}>On Field</span>
                </div>
                )}
                {nextMatch && (
                <div>
                  <MatchDisplay halfWidth match={nextMatch} />
                  <span className={styles.description}>On Deck</span>
                </div>
                )}
              </div>
              {queueingMatches.map((x) => (
                <MatchDisplay
                  className={styles.queueingMatches}
                  match={x}
                  key={x?.num}
                />
              ))}
            </div>
          </div>
          )}
      </div>
    </>
  );
};

export default PlayoffQueueing;
