import { h, Fragment } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import {
  getDatabase, off, onValue, ref,
} from 'firebase/database';
import {
  Alliance, Bracket, PlayoffMatchup,
} from '../../types';
import MenuBar from '../MenuBar';
import styles from './styles.scss';
import AppContext from '../../appContext';

type MatchupSide = {
  alliance: number,
  teams: string,
  wins: number
};

function toPairs(arr: PlayoffMatchup[]): PlayoffMatchup[][] {
  return arr.reduce<PlayoffMatchup[][]>((result, _, index, array) => {
    if (index % 2 === 0) result.push(array.slice(index, index + 2));
    return result;
  }, []);
}

// FIXME: On Safari, sometimes this will not display properly on first render. The matchup box
// won't be big enough and the check marks will be cut off. This does not occur 100% of the time.
const PlayoffBracket = () => {
  const { event, season, token } = useContext(AppContext);
  const [alliances, setAlliances] = useState<Alliance[] | undefined>(undefined);
  const [bracket, setBracket] = useState<Bracket | undefined>(undefined);

  useEffect(() => {
    if (!token) return () => {};

    console.log('running effect for', token, getDatabase());
    const alliancesRef = ref(getDatabase(), `/seasons/${season}/alliances/${token}`);
    onValue(alliancesRef, (snap) => {
      console.log('alliances', snap.val());
      setAlliances(snap.val() as Alliance[]);
    });

    const bracketRef = ref(getDatabase(), `/seasons/${season}/bracket/${token}`);
    onValue(bracketRef, (snap) => {
      console.log('bracket', snap.val());
      setBracket(snap.val() as Bracket);
    });

    return () => {
      off(alliancesRef);
      off(bracketRef);
    };
  }, [season, event?.eventCode, token]);

  const MatchupSide = ({ color, side }: { color: 'red' | 'blue', side: MatchupSide | null }) => (
    <div className={[styles.participant, styles[color], side && side.wins >= 2 ? styles.winner : ''].join(' ')}>
      {!side && <span>?</span>}
      {side && (
        <span>
          <strong>{side.alliance}</strong>: {side.teams}
          <span className={styles.checks}>
            {[...Array(side.wins)].map(() => (<img alt="Check" src="/assets/check.svg" />))}
          </span>
        </span>
      )}
    </div>
  );

  function getTeamsInAlliance(num: number): string {
    const alliance = alliances?.find((x) => x.number === num);
    if (!alliance) return '';
    return `${alliance.captain}, ${alliance.round1}, ${alliance.round2}`;
  }

  const Matchup = ({
    match: {
      name, redAlliance, blueAlliance, wins,
    },
  }: { match: PlayoffMatchup }) => (
    <div className={styles.matchup}>
      <span className={styles.matchName}>{name}</span>
      <div className={styles.participants}>
        <MatchupSide color="red" side={redAlliance ? { alliance: redAlliance, teams: getTeamsInAlliance(redAlliance), wins: wins.red } : null} />
        <MatchupSide color="blue" side={blueAlliance ? { alliance: blueAlliance, teams: getTeamsInAlliance(blueAlliance), wins: wins.blue } : null} />
      </div>
    </div>
  );
  return (
    <div>
      <MenuBar event={event} season={season} />
      {(!bracket || !alliances) && <div className={styles.infoText}>Waiting for alliances...</div>}
      {bracket && alliances && (
        <div className={styles.bracket}>
          <section className={[styles.round, styles.quarterfinals].join(' ')}>
            {toPairs(bracket.qf).map(([match1, match2]) => (
              <>
                <div className={styles.winners}>
                  <div className={styles.matchups}>
                    <Matchup match={match1} />
                    <Matchup match={match2} />
                  </div>
                  <div className={styles.connector}>
                    <div className={styles.merger} />
                    <div className={styles.line} />
                  </div>
                </div>
              </>
            ))}
          </section>
          <section className={[styles.round, styles.semifinals].join(' ')}>
            {toPairs(bracket.sf).map(([match1, match2]) => (
              <>
                <div className={styles.winners}>
                  <div className={styles.matchups}>
                    <Matchup match={match1} />
                    <Matchup match={match2} />
                  </div>
                  <div className={styles.connector}>
                    <div className={styles.merger} />
                    <div className={styles.line} />
                  </div>
                </div>
              </>
            ))}
          </section>
          <section className={[styles.round, styles.finals].join(' ')}>
            <div className={styles.winners}>
              <div className={styles.matchups}>
                <Matchup match={bracket.f[0]} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default PlayoffBracket;
