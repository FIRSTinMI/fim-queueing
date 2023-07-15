import {
  createRef, h, RefObject, Fragment,
} from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import {
  getDatabase, ref, onValue, off,
} from 'firebase/database';
import { TeamRanking } from '@/types';
import MenuBar from '../../MenuBar';
import styles from './styles.module.scss';
import AppContext from '../../../AppContext';

const numFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TeamRankings = () => {
  const { event, season, token } = useContext(AppContext);
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  useEffect(() => {
    if (!token) throw new Error('Token was somehow empty.');

    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
    });

    return () => { off(rankingsRef); };
  }, []);

  const tableRef: RefObject<HTMLTableSectionElement> = createRef();
  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.style.animationDuration = `${(tableRef.current.clientHeight / 40)}s`;
  }, [tableRef]);

  return (
    <>
      <MenuBar event={event} season={season} />
      <div className={styles.teamRankings}>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team #</th>
              <th>RS</th>
              {/* Game specific: 2023 */}
              <th>Match</th>
              <th>Charge</th>
              <th>Auto</th>
              {/* End game specific */}
              <th>
                <span className={styles.wtlCell}>
                  <span>W</span>
                  <span>-</span>
                  <span>T</span>
                  <span>-</span>
                  <span>L</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {rankings.map((ranking) => (
              <tr key={ranking.rank}>
                <td>{ranking.rank}</td>
                <td>{ranking.teamNumber}</td>
                <td>{numFmt.format(ranking.rankingPoints)}</td>
                {/* Game specific: 2023 */}
                <td>{numFmt.format(ranking.sortOrder2)}</td>
                <td>{numFmt.format(ranking.sortOrder3)}</td>
                <td>{numFmt.format(ranking.sortOrder4)}</td>
                {/* End game specific */}
                <td className={styles.wtlCell}>
                  <span>{ranking.wins ?? 0}</span>
                  <span>-</span>
                  <span>{ranking.ties ?? 0}</span>
                  <span>-</span>
                  <span>{ranking.losses ?? 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TeamRankings;
