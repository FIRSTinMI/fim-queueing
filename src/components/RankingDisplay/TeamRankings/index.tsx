import {
  createRef, h, RefObject, Fragment,
} from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import {
  getDatabase, ref, onValue, off,
} from 'firebase/database';
import { TeamRanking } from '../../../types';
import MenuBar from '../../MenuBar';
import styles from './styles.scss';
import AppContext from '../../../AppContext';

const TeamRankings = () => {
  const { event, season, token } = useContext(AppContext);
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  useEffect(() => {
    if (!token) throw new Error('Token was somehow empty.');

    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[]).sort((a, b) => a.rank - b.rank));
    });

    return () => { off(rankingsRef); };
  }, []);

  const tableRef: RefObject<HTMLTableSectionElement> = createRef();
  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.style.animationDuration = `${(tableRef.current.clientHeight / 75)}s`;
  }, [tableRef]);

  return (
    <>
      <MenuBar event={event} season={season} />
      <div className={styles.teamRankings}>
        <div className={styles.betaBar}>
          β -
          This display is currently a work in progress. Utilize <u>frc.events</u> for official data.
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team #</th>
              <th>RP</th>
              {/* Game specific: 2023 */}
              <th>Match</th>
              <th>Charge</th>
              <th>Auto</th>
              {/* End game specific */}
              <th>W-T-L</th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {rankings.map((ranking) => (
              <tr key={ranking.rank}>
                <td>{ranking.rank}</td>
                <td>{ranking.teamNumber}</td>
                <td>{ranking.rankingPoints}</td>
                {/* Game specific: 2023 */}
                <td>{ranking.sortOrder2}</td>
                <td>{ranking.sortOrder3}</td>
                <td>{ranking.sortOrder4}</td>
                {/* End game specific */}
                <td>{`${ranking.wins ?? 0}-${ranking.ties ?? 0}-${ranking.losses ?? 0}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TeamRankings;
