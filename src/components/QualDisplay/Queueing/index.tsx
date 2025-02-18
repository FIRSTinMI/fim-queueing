import { h, Fragment } from 'preact';
import { DatabaseReference, getDatabase, child, ref, update } from 'firebase/database';
import { useEffect, useState, useRef, } from 'preact/hooks';
import styles from './styles.module.scss';
import MatchDisplay from '../MatchDisplay';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import MenuBar from '../../MenuBar';
import { useRealtimeMatches } from "@/hooks/supabase/useRealtimeMatches";
import { useFirebaseEvent } from "@/hooks/firebase/useFirebaseEvent";
import { useRealtimeEvent } from "@/hooks/supabase/useRealtimeEvent";
import { useRealtimeRankings } from "@/hooks/supabase/useRealtimeRankings";
import { Match } from "@/hooks/supabase/useGetMatches";

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';

const Queueing = () => {
  const { data: event } = useRealtimeEvent();
  const { data: matches } = useRealtimeMatches('Qualification');
  const { data: firebaseEvent } = useFirebaseEvent();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const dbEventRef = useRef<DatabaseReference>();
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: Match | null,
    nextMatch: Match | null,
    queueingMatches: Match[]
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });
  const rankings = useRealtimeRankings();

  useEffect(() => {
    if (!event?.code || !event?.seasons?.name) return () => {};
    dbEventRef.current = ref(getDatabase(), `/seasons/${event.seasons.name}/events/${event.key}`);
  }, [event?.code, event?.seasons?.name]);

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
      <label htmlFor="rankingDisplay">
        Rankings:
        {/* @ts-ignore */}
        <input type="checkbox" checked={firebaseEvent?.options?.showRankings ?? false} onInput={(e): void => setShowRankings(e.target.checked)} id="rankingDisplay" />
      </label>

      <label htmlFor="eventNameDisplay">
        Show event name:
        {/* @ts-ignore */}
        <input type="checkbox" checked={firebaseEvent?.options?.showEventName ?? false} onInput={(e): void => setShowEventName(e.target.checked)} id="eventNameDisplay" />
      </label>
    </>
  );

  useEffect(() => {
    // TODO: Handle schedule deviations
    const unplayedMatches = matches?.sort((a, b) => (a.match_number - b.match_number) || ((a.play_number ?? 0) - (b.play_number ?? 0))).filter(m => !m.actual_start_time && !m.is_discarded);
    if (!unplayedMatches || unplayedMatches.length == 0) {
      setLoadingState('ready');
      return;
    }

    try {
      setDisplayMatches({
        currentMatch: unplayedMatches[0],
        nextMatch: unplayedMatches[1],
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4].map((x) => unplayedMatches[x])
          .filter((x) => x),
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  }, [matches]);

  const { currentMatch, nextMatch, queueingMatches } = displayMatches;
  return (
    <>
      <MenuBar options={menuOptions()} />
      <div className={styles.fullHeight}>
        {loadingState === 'loading' && <div className={styles.infoText}>Loading matches...</div>}
        {loadingState === 'error' && <div className={styles.infoText}>Failed to fetch matches</div>}
        {loadingState === 'noAutomatic' && <div className={styles.infoText}>Unable to run in automatic mode. Press the &apos;a&apos; key to switch modes.</div>}
        {loadingState === 'ready' && !matches?.length && <div className={styles.infoText}>Waiting for schedule to be posted...</div>}
        {loadingState === 'ready' && matches?.length !== 0 && currentMatch === null && <div className={styles.infoText}>Qualification matches have ended</div> }
        {loadingState === 'ready' && matches?.length !== 0 && event
          && (
          <div className={styles.qualsDisplay}>
            <div className={styles.matches}>
              {(firebaseEvent?.options?.showEventName ?? false) && (
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
                  key={x.id}
                />
              ))}
            </div>
            {((firebaseEvent?.options?.showRankings ?? false) && !rankings.isPending ? (
              <RankingList style={{ height: '1.5em' }}>
                {rankings.data?.map((x) => (<Ranking teamNumber={x.team_number} ranking={x.rank} />))}
              </RankingList>
            ) : <></>)}
          </div>
          )}
      </div>
    </>
  );
};

export default Queueing;
