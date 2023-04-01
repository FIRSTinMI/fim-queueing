import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, ref, onValue, off,
} from 'firebase/database';
import {
  useContext, useEffect, useState, useRef,
} from 'preact/hooks';

import { TeamRanking } from '@/types';
import AppContext from '@/AppContext';
import styles from './styles.scss';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import MenuBar from '../../MenuBar';

const KeyableTicker = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');
  const dbEventRef = useRef<DatabaseReference>();

  const [forceBottom, setForceBottom] = useState(false);
  const [bgColor, setBgColor] = useState('#FF00FF');
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [showAsOf, setShowAsOf] = useState<boolean>(true);
  const [asOf, setAsOf] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);
  }, [event.eventCode, season, token]);

  useEffect(() => {
    if (!showAsOf || !event.lastModifiedMs) {
      setAsOf('');
      return;
    }
    if (event.lastModifiedMs < Date.now() - 24 * 60 * 60 * 1000) {
      setAsOf('a long time ago');
      return;
    }

    setAsOf(new Date(event.lastModifiedMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'shortGeneric' }));
  }, [event.lastModifiedMs, showAsOf]);

  const menuOptions = () => (
    <>
      <label htmlFor="forceBottom">
        Force Bottom:
        {/* @ts-ignore */}
        <input type="checkbox" checked={forceBottom} onInput={(e): void => setForceBottom(e.target.checked)} id="forceBottom" />
      </label>

      <label htmlFor="showAsOf">
        Show as of:
        {/* @ts-ignore */}
        <input type="checkbox" checked={showAsOf} onInput={(e): void => setShowAsOf(e.target.checked)} id="showAsOf" />
      </label>

      <label htmlFor="bgColorSelect">
        Select BG Color
        {/* @ts-ignore */}
        <input type="color" value={bgColor} onInput={(e): void => setBgColor(e.target.value)} id="bgColorSelect" />
      </label>
    </>
  );

  useEffect(() => {
    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
    });
    return () => { off(rankingsRef); };
  }, []);

  return (
    <>
      <MenuBar event={event} season={season} options={menuOptions()} />
      {/* Give this div a custom ID so that it can be re-styled in applications like OBS */}
      <div id="chroma-background" className={styles.fullHeight} style={{ background: bgColor }}>
        <div className={[styles.tickerBox, (forceBottom ? styles.staticBottom : styles.staticTop)].join(' ')}>
          <RankingList>
            {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
          </RankingList>
          {asOf !== ''
            && <div className={styles.asOf}>As of {asOf}</div>}
        </div>
      </div>
    </>
  );
};

export default KeyableTicker;
