import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, child, ref, update, onValue, off,
} from 'firebase/database';
import {
  useContext, useEffect, useState, useRef, useReducer,
} from 'preact/hooks';

import { AppMode, QualMatch } from '@shared/DbTypes';
import { TeamRanking } from '@/types';
import AppContext from '@/AppContext';
import styles from './styles.module.scss';
import MatchDisplay from '../MatchDisplay';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import MenuBar from '../../MenuBar';

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const Queueing = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const dbEventRef = useRef<DatabaseReference>();
  const [qualMatches, setQualMatches] = useState<QualMatch[]>([]);
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: QualMatch | null,
    nextMatch: QualMatch | null,
    queueingMatches: QualMatch[]
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });
  const [rankings, setRankings] = useState<TeamRanking[]>([]);

  useEffect(() => {
    if (!token) return () => {};

    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);

    const matchesRef = ref(getDatabase(), `/seasons/${season}/qual/${token}`);
    onValue(matchesRef, (snap) => {
      setQualMatches(snap.val() as QualMatch[]);
    });

    return () => {
      off(matchesRef);
    };
  }, [event.eventCode, season, token]);

  const getMatchByNumber = (matchNumber: number): QualMatch | null => qualMatches?.find(
    (x) => x.number === matchNumber,
  ) ?? null;

  const updateMatches = (): void => {
    const matchNumber = event.currentMatchNumber;

    if (matchNumber === null || matchNumber === undefined) {
      if (dbEventRef.current === undefined) return; // throw new Error('No event ref');
      update(dbEventRef.current, {
        currentMatchNumber: 1,
      });
      return;
    }

    try {
      setDisplayMatches({
        currentMatch: getMatchByNumber(matchNumber),
        nextMatch: getMatchByNumber(matchNumber + 1),
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4].map((x) => getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as QualMatch[],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  };

  /**
   * Swap the event's mode
   * NOTE: This function must use refs instead of state. It can be called by an event listener
   * which is only initialized as the component mounts.
   * @param {"automatic" | "assisted" | null} mode The mode to switch to
   */
  const swapMode = (mode: AppMode | null = null): void => {
    if (dbEventRef.current === undefined) throw new Error('No event ref');
    let appMode = mode;
    if (appMode === null) appMode = event.mode === 'assisted' ? 'automatic' : 'assisted';
    if (appMode === 'assisted') {
      if (loadingState === 'noAutomatic' || event.currentMatchNumber === null) {
        updateMatches();
      }
    }
    update(dbEventRef.current, {
      mode: appMode,
    });
  };

  /**
   * A reducer is being used because some actions can be performed in the context of an event
   * listener, where access to the current state is not guaranteed.
   */
  const [_, dispatchEventChange] = useReducer<void, {
    type: 'decrement' | 'increment' | 'set' | 'swap',
    /** Used if type === 'set' */
    number?: number
    /** Used if type === 'swap' */
    mode?: AppMode
  }>((_s, action) => {
    if (!dbEventRef.current) throw new Error('DB ref not defined');
    const { type, number, mode } = action;
    if (type === 'swap') {
      swapMode(mode);
      return;
    }

    if (event.mode !== 'assisted') {
      console.warn('Tried to set current match number while not in assisted mode!');
      return;
    }
    let newMatchNumber: number;
    if (type === 'increment') {
      newMatchNumber = event.currentMatchNumber! + 1;
    } else if (type === 'decrement') {
      if (event.mode !== 'assisted') return;
      newMatchNumber = event.currentMatchNumber! - 1;
    } else if (type === 'set') {
      if (event.mode !== 'assisted') return;
      if (number === undefined) throw new Error('`number` is required for `set` dispatches');
      newMatchNumber = number;
    } else {
      throw new Error('Unknown action type passed to match number reducer');
    }
    update(dbEventRef.current, {
      currentMatchNumber: newMatchNumber,
    });
  }, undefined);

  const handleKeyPress = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyA':
        dispatchEventChange({ type: 'swap' });
        break;
      case 'ArrowLeft':
        dispatchEventChange({ type: 'decrement' });
        break;
      case 'ArrowRight':
        dispatchEventChange({ type: 'increment' });
        break;
      default:
        break;
    }
  };

  const setShowEventName = (value: boolean): void => {
    if (dbEventRef.current === undefined) throw new Error('No event ref');
    update(child(dbEventRef.current, 'options'), {
      showEventName: value,
    });
  };

  const setShowRankings = (value: boolean): void => {
    if (dbEventRef.current === undefined) throw new Error('No event ref');
    update(child(dbEventRef.current, 'options'), {
      showRankings: value,
    });
  };

  const menuOptions = () => (
    <>
      <label htmlFor="modeSelect">
        Mode:
        <select
          value={event.mode}
          /* @ts-ignore */
          onInput={(e): void => dispatchEventChange({ type: 'swap', mode: e.target.value })}
          id="modeSelect"
        >
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

  useEffect(() => {
    updateMatches();
  }, [event.currentMatchNumber, qualMatches]);

  useEffect(() => {
    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    if (event.options?.showRankings) {
      onValue(rankingsRef, (snap) => {
        setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
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
                <button
                  type="button"
                  onClick={() => dispatchEventChange({ type: 'decrement' })}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => dispatchEventChange({ type: 'increment' })}
                >
                  Next
                </button>
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
                  key={x.number}
                />
              ))}
            </div>
            {(event.options?.showRankings ?? false ? (
              <RankingList style={{ height: '1.5em' }}>
                {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
              </RankingList>
            ) : <></>)}
          </div>
          )}
      </div>
    </>
  );
};

export default Queueing;
