import { h, Fragment } from 'preact';
import { DatabaseReference, getDatabase, child, ref, update } from 'firebase/database';
import { useEffect, useState, useRef, useMemo, } from 'preact/hooks';
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
import { useRealtimeScheduleDeviations } from "@/hooks/supabase/useRealtimeScheduleDeviations";
import { ScheduleDeviation } from "@/hooks/supabase/useGetScheduleDeviations";

type LoadingState = 'loading' | 'ready' | 'error' | 'noAutomatic';
type DisplayMatch = Match | ScheduleDeviation;

const MATCHES_TO_SHOW = 5;

const Queueing = () => {
  const { data: event } = useRealtimeEvent();
  const { data: matches } = useRealtimeMatches('Qualification');
  const { data: scheduleDeviations } = useRealtimeScheduleDeviations('Qualification');
  const { data: firebaseEvent } = useFirebaseEvent();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const dbEventRef = useRef<DatabaseReference>();
  const [displayMatches, setDisplayMatches] = useState<{
    currentMatch: DisplayMatch | null,
    nextMatch: DisplayMatch | null,
    queueingMatches: DisplayMatch[]
  }>({ currentMatch: null, nextMatch: null, queueingMatches: [] });
  const rankings = useRealtimeRankings();
  const sortedRankings = useMemo(() => 
    rankings.data ? rankings.data.sort((a, b) => a.rank - b.rank) : [], [rankings.data]);

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
    const scheduleItems : (Match | ScheduleDeviation)[] | undefined = matches?.sort((a, b) => (a.match_number - b.match_number) || ((a.play_number ?? 0) - (b.play_number ?? 0))).filter(m => !m.actual_start_time && !m.is_discarded);
    if (!scheduleItems || scheduleItems.length == 0) {
      setLoadingState('ready');
      return;
    }
    
    for (let i = 0; i < MATCHES_TO_SHOW; i++) {
      const matchId = scheduleItems[i]?.id;
      const deviationAfter = scheduleDeviations
        ? scheduleDeviations.find(d => d.after_match_id.id == matchId)
        : null;
      
      if (deviationAfter) {
        if (deviationAfter.description) {
          scheduleItems.splice(i + 1, 0, deviationAfter);
          i++;
        }
      }
    }

    try {
      setDisplayMatches({
        currentMatch: scheduleItems[0],
        nextMatch: MATCHES_TO_SHOW > 1 ? scheduleItems[1] : null,
        // By default, we'll take the three matches after the one on deck
        queueingMatches: MATCHES_TO_SHOW > 2 
          ? [...Array(MATCHES_TO_SHOW - 2)].map((_, i) => scheduleItems[i+2])
            .filter((x) => x)
          : [],
      });
      setLoadingState('ready');
    } catch (e) {
      setLoadingState('error');
      console.error(e);
    }
  }, [matches, scheduleDeviations]);

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
                  {'match_number' in currentMatch && <MatchDisplay halfWidth match={currentMatch} /> }
                  {'description' in currentMatch && <p className={styles.scheduleDeviation}>{currentMatch.description}</p>}
                  <span className={styles.description}>On Field</span>
                </div>
                )}
                {nextMatch && (
                <div>
                  {'match_number' in nextMatch && <MatchDisplay halfWidth match={nextMatch} /> }
                  {'description' in nextMatch && <p className={styles.scheduleDeviation}>{nextMatch.description}</p>}
                  <span className={styles.description}>On Deck</span>
                </div>
                )}
              </div>
              {queueingMatches.map((x) => (<>
                {'match_number' in x && <MatchDisplay key={x.id} match={x} className={styles.queueingMatches} /> }
                {'description' in x && <p key={`sd-${x.id}`} className={styles.scheduleDeviation}>{x.description}</p>}
              </>))}
            </div>
            {((firebaseEvent?.options?.showRankings ?? false) && !rankings.isPending ? (
              <RankingList style={{ height: '1.5em' }}>
                {sortedRankings.map((x) => (<Ranking teamNumber={x.team_number} ranking={x.rank} />))}
              </RankingList>
            ) : <></>)}
          </div>
          )}
      </div>
    </>
  );
};

export default Queueing;
