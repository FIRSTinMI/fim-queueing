import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, child, ref, update, onValue, off,
} from 'firebase/database';
import { useContext, useEffect, useState } from 'preact/hooks';

import {
  AppMode, Match, TeamRanking,
} from '../../../types';
import MatchDisplay from '../MatchDisplay';
import AnalyticsService from '../../../analyticsService';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import styles from './styles.scss';
import MenuBar from '../../MenuBar';
import AppContext from '../../../appContext';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const Queueing = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [eventRef, setEventRef] = useState<DatabaseReference>();
  const [qualMatches, setQualMatches] = useState<Match[]>([]);
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: Match | null,
    nextMatch: Match | null,
    queueingMatches: Match[]
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });
  const [rankings, setRankings] = useState<TeamRanking[]>([]);

  useEffect(() => {
    if (!token) return () => {};

    setEventRef(ref(getDatabase(), `/seasons/${season}/events/${token}`));

    const matchesRef = ref(getDatabase(), `/seasons/${season}/matches/${token}`);
    onValue(matchesRef, (snap) => {
      setQualMatches(snap.val() as Match[]);
    });

    return () => {
      off(matchesRef);
    };
  }, [event.eventCode, season, token]);

  const decrementMatchNumber = (): void => {
    if (eventRef === undefined) throw new Error('No event ref');
    if (event.mode !== 'assisted') return;
    const matchNumber = event.currentMatchNumber ?? 0;
    update(eventRef, {
      currentMatchNumber: matchNumber - 1,
    });
  };

  const incrementMatchNumber = (): void => {
    if (event.mode !== 'assisted') return;
    if (eventRef === undefined) throw new Error('No event ref');
    const matchNumber = event.currentMatchNumber ?? 0;
    update(eventRef, {
      currentMatchNumber: matchNumber + 1,
    });
  };

  const getMatchByNumber = (matchNumber: number): Match | null => qualMatches?.find(
    (x) => x.matchNumber === matchNumber,
  ) ?? null;

  const updateMatches = (): void => {
    const matchNumber = event.currentMatchNumber;

    if (matchNumber === null || matchNumber === undefined) {
      if (eventRef === undefined) throw new Error('No event ref');
      update(eventRef, {
        currentMatchNumber: 1,
      });
      return;
    }

    try {
      console.log('Match number changed, updating state');
      setDisplayMatches({
        currentMatch: getMatchByNumber(matchNumber),
        nextMatch: getMatchByNumber(matchNumber + 1),
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4].map((x) => getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as Match[],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  };

  const swapMode = (mode: AppMode | null = null): void => {
    if (eventRef === undefined) throw new Error('No event ref');
    let appMode = mode;
    if (appMode === null) appMode = event.mode === 'assisted' ? 'automatic' : 'assisted';
    if (appMode === 'assisted') {
      if (loadingState === 'noAutomatic' || event.currentMatchNumber === null) {
        updateMatches();
      }
    }
    update(eventRef, {
      mode: appMode,
    });

    AnalyticsService.logEvent('modeSwitch', {});
  };

  const handleKeyPress = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyA':
        swapMode();
        break;
      case 'ArrowLeft':
        decrementMatchNumber();
        break;
      case 'ArrowRight':
        incrementMatchNumber();
        break;
      default:
        break;
    }
  };

  const setShowEventName = (value: boolean): void => {
    if (eventRef === undefined) throw new Error('No event ref');
    update(child(eventRef, 'options'), {
      showEventName: value,
    });
  };

  const setShowRankings = (value: boolean): void => {
    if (eventRef === undefined) throw new Error('No event ref');
    update(child(eventRef, 'options'), {
      showRankings: value,
    });
  };

  const menuOptions = () => (
    <>
      <label htmlFor="modeSelect">
        Mode:
        {/* @ts-ignore */}
        <select value={event.mode} onInput={(e): void => swapMode(e.target.value)} id="modeSelect">
          <option value="automatic">Automatic</option>
          <option value="assisted">Assisted</option>
        </select>
      </label>

      {event.mode === 'assisted' && <div className={styles.assistedInstruction}>Use the left/right arrow keys to change current match</div>}

      <label htmlFor="rankingDisplay">
        Rankings:
        {/* @ts-ignore */}
        <input type="checkbox" checked={event.options?.showRankings ?? false} onInput={(e): void => setShowRankings(e.target.checked)} id="rankingDisplay" />
      </label>

      <label htmlFor="eventNameDisplay">
        Show event name:
        {/* @ts-ignore */}
        <input type="checkbox" checked={event.options?.showEventName ?? false} onInput={(e): void => setShowEventName(e.target.checked)} id="eventNameDisplay" />
      </label>
    </>
  );

  useEffect(() => {
    if (typeof document === undefined) return () => {};

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // FIXME (@evanlihou): This effect runs twice on initial load, which causes the "waiting for
  // schedule to be posted" message to flash on the screen for one rendering cycle
  useEffect(() => {
    updateMatches();
  }, [event.currentMatchNumber, qualMatches]);

  useEffect(() => {
    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    if (event.options?.showRankings) {
      onValue(rankingsRef, (snap) => {
        setRankings((snap.val() as TeamRanking[]).sort((a, b) => a.rank - b.rank));
      });
    } else {
      off(rankingsRef);
    }

    return () => { off(rankingsRef); };
  }, [event.options?.showRankings]);

  const { currentMatch, nextMatch, queueingMatches } = displayMatches;
  return (
    <>
      <MenuBar event={event} season={season} options={menuOptions()} />
      <div className={styles.fullHeight}>
        {loadingState === 'loading' && <div className={styles.infoText}>Loading matches...</div>}
        {loadingState === 'error' && <div className={styles.infoText}>Failed to fetch matches</div>}
        {loadingState === 'noAutomatic' && <div className={styles.infoText}>Unable to run in automatic mode. Press the &apos;a&apos; key to switch modes.</div>}
        {loadingState === 'ready' && !qualMatches?.length && <div className={styles.infoText}>Waiting for schedule to be posted...</div>}
        {loadingState === 'ready' && qualMatches?.length !== 0
          && (
          <div className={styles.qualsDisplay}>
            {event.mode === 'assisted' && (
              <div className={styles.touchMatchControlButtons}>
                <button type="button" onClick={() => decrementMatchNumber()}>Prev</button>
                <button type="button" onClick={() => incrementMatchNumber()}>Next</button>
              </div>
            )}
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
                  key={x.matchNumber}
                />
              ))}
            </div>
            {(event.options?.showRankings ?? false ? (
              <RankingList>
                {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
              </RankingList>
            ) : '')}
          </div>
          )}
      </div>
    </>
  );
};

export default Queueing;
