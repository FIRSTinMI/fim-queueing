import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import {
  getDatabase, off, onValue, ref,
} from 'firebase/database';

import styles from './styles.scss';
import DoubleEliminationBracket from './TournamentBracket/DoubleEliminationBracket';
import { Alliance } from '../../types';
import { PlayoffMatch } from '../../../shared/DbTypes';
import MenuBar from '../MenuBar';
import AppContext from '../../AppContext';
import Match from './TournamentBracket/Match';
import { BracketMatchNumber } from '../../../shared/DoubleEliminationBracketMapping';

/**
 * TODO: A bracket for double elimination playoffs
 */
const PlayoffBracket = () => {
  const { event, season, token } = useContext(AppContext);
  const [alliances, setAlliances] = useState<Alliance[] | undefined>(undefined);
  const [bracket, setBracket] = useState<Record<BracketMatchNumber, PlayoffMatch> | undefined>();

  // Populate alliances and the bracket from RTDB
  useEffect(() => {
    if (!token) return () => {};
    const alliancesRef = ref(getDatabase(), `/seasons/${season}/alliances/${token}`);
    onValue(alliancesRef, (snap) => {
      console.log('alliances', snap.val());
      setAlliances(snap.val() as Alliance[]);
    });

    const bracketRef = ref(getDatabase(), `/seasons/${season}/bracket/${token}`);
    onValue(bracketRef, (snap) => {
      console.log('bracket', snap.val());
      setBracket(snap.val() as Record<BracketMatchNumber, PlayoffMatch>);
    });

    return () => {
      off(alliancesRef);
      off(bracketRef);
    };
  }, [season, event?.eventCode, token]);

  return (
    <div>
      <MenuBar event={event} season={season} />
      {(!bracket || !alliances) && (
        <div className={styles.infoText}>Waiting for alliances...</div>
      )}
      {bracket && alliances && (
        <div style={{ padding: '1em' }}>
          <DoubleEliminationBracket
            matchResults={bracket}
            alliances={alliances}
            matchComponent={Match}
          />
        </div>
      )}
    </div>
  );
};

export default PlayoffBracket;
