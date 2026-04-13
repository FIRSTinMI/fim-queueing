import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, child, ref, update, onValue, off,
} from 'firebase/database';
import {
  useContext, useEffect, useState, useRef, useReducer,
} from 'preact/hooks';

import { AppMode } from '@shared/DbTypes';
import { TeamRanking } from '@/types';
import AppContext from '@/AppContext';
import styles from './styles.module.scss';
import MatchDisplay from '../MatchDisplay';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import MenuBar from '../../MenuBar';
import useQueueingQualMatches from '@/hooks/useQueueingQualMatches';

function Queueing() {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');

  const dbEventRef = useRef<DatabaseReference>();
  const displayMatches = useQueueingQualMatches({
    numQueueing: 3,
  });
  const [rankings, setRankings] = useState<TeamRanking[]>([]);

  useEffect(() => {
    if (!token) return;

    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);
  }, [event.eventCode, season, token]);

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
  const {
    now: currentMatch,
    next: nextMatch,
    queueing: queueingMatches,
    state: loadingState,
    hasSchedule,
  } = displayMatches;
  return (
    <>
      <MenuBar event={event} season={season} options={menuOptions()} />
      <div className={styles.fullHeight}>
        {loadingState === 'loading' && <div className={styles.infoText}>Loading matches...</div>}
        {loadingState === 'error' && <div className={styles.infoText}>Failed to fetch matches</div>}
        {loadingState === 'ready' && !hasSchedule && <div className={styles.infoText}>Waiting for schedule to be posted...</div>}
        {loadingState === 'ready' && hasSchedule
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
                {currentMatch ? (
                  <div>
                    <MatchDisplay halfWidth match={currentMatch} />
                    <span className={styles.description}>On Field</span>
                  </div>
                ) : (
                  <div>
                    <span className={styles.description}>Qualification matches have concluded</span>
                  </div>
                )}
                {nextMatch && (
                <div>
                  <MatchDisplay halfWidth match={nextMatch} />
                  <span className={styles.description}>On Deck</span>
                </div>
                )}
              </div>
              {queueingMatches?.map((x) => (
                <MatchDisplay
                  className={styles.queueingMatches}
                  match={x}
                  key={x.type === 'break' ? x.description : x.number}
                />
              ))}
            </div>
            {((event.options?.showRankings ?? false) && (
              <RankingList style={{ height: '1.5em' }}>
                {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
              </RankingList>
            ))}
          </div>
          )}
      </div>
    </>
  );
}

export default Queueing;
