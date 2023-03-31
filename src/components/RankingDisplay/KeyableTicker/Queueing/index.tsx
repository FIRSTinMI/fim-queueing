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
import Ranking from '../../../Tickers/Ranking';
import RankingList from '../../../Tickers/RankingList';
import MenuBar from '../../../MenuBar';

const KeyableTicker = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');
  const dbEventRef = useRef<DatabaseReference>();

  const [forceBottom, setForceBottom] = useState(false);
  const [bgColor, setBgColor] = useState('#FF00FF');
  const [rankings, setRankings] = useState<TeamRanking[]>([]);

  useEffect(() => {
    if (!token) return () => { };
    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);
  }, [event.eventCode, season, token]);

  const menuOptions = () => (
    <>
      <label htmlFor="rankingDisplay">
        Force Bottom:
        {/* @ts-ignore */}
        <input type="checkbox" checked={forceBottom} onInput={(e): void => setForceBottom(e.target.checked)} id="forceBottom" />
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
      <div className={styles.fullHeight} style={{background: bgColor}}>
        <div className={forceBottom ? styles.staticBottom : styles.staticTop}>
          <RankingList>
            {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
          </RankingList>
        </div>
      </div>
    </>
  );
};

export default KeyableTicker;
