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
import numberToOrdinal from '@/util/numberToOrdinal';
import { useRealtimeRankings } from "@/hooks/supabase/useRealtimeRankings";
import styled from "styled-components";

const numFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Message = styled.div`
  text-align: center;
  width: 100%;
  padding-block: 5vw;
`;

const TeamRankings = () => {
  var rankings = useRealtimeRankings();

  const tableRef: RefObject<HTMLTableSectionElement> = createRef();
  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.style.animationDuration = `${(tableRef.current.clientHeight / 40)}s`;
  }, [tableRef]);

  if (rankings.isError) return (
    <Message>Failed to load rankings: {rankings.error?.message}</Message>
  );
  
  if (rankings.isPending) return (<Message>Loading...</Message>);
  
  return (
    <>
      <MenuBar />
      <div className={styles.teamRankings}>
        {/* TODO(@evanlihou): Reenable display of event name */}
        {/*{event?.options.showEventName === true && (*/}
        {/*  <div className={styles.eventName}>{event.name} ({season})</div>*/}
        {/*)}*/}
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team #</th>
              <th>RS</th>
              {/* Game specific: 2025 */}
              <th>Coop</th>
              <th>Match</th>
              <th>Auto</th>
              <th>Barge</th>
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
            {rankings.data?.map((ranking) => (
              <tr key={ranking.rank}>
                <td>{numberToOrdinal(ranking.rank)}</td>
                <td>{ranking.team_number}</td>
                <td>{numFmt.format(ranking.sort_orders[0])}</td>
                {/* Game specific: 2024 */}
                <td>{numFmt.format(ranking.sort_orders[1])}</td>
                <td>{numFmt.format(ranking.sort_orders[2])}</td>
                <td>{numFmt.format(ranking.sort_orders[3])}</td>
                <td>{numFmt.format(ranking.sort_orders[4])}</td>
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
