import { createRef, h, RefObject, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { Event, TeamRanking } from '../../../types';
import MenuBar from '../../MenuBar';
import Cookies from 'js-cookie';
import styles from './styles.scss';

type TeamRankingsProps = {
  event: Event,
  season: number
}

const TeamRankings = (props: TeamRankingsProps) => {
  const { event, season } = props;
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  useEffect(() => {
    const token = Cookies.get('queueing-event-key') as string;
    if (!token) throw new Error('Token was somehow empty.');

    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
      onValue(rankingsRef, (snap) => {
        setRankings((snap.val() as TeamRanking[]).sort((a, b) => a.rank - b.rank));
      });
    
    return () => {off(rankingsRef);};
  }, []);

  const tableRef: RefObject<HTMLTableSectionElement> = createRef();
  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.style.animationDuration = `${(tableRef.current.clientHeight / 75)}s`;
  }, [tableRef]);
  
  return (
    <>
      <MenuBar event={event} season={season}></MenuBar>
      <div className={styles.teamRankings}>
        <div className={styles.betaBar}>β - This page is currently a work in progress. More data will be added soon!</div>
        <table>
          <thead>
            <th>Rank</th>
            <th>Team #</th>
            <th>W-T-L</th>
          </thead>
          <tbody ref={tableRef}>
            {rankings.map(ranking => (<tr key={ranking.rank}>
              <td>{ranking.rank}</td>
              <td>{ranking.teamNumber}</td>
              <td>0-0-0</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TeamRankings;
