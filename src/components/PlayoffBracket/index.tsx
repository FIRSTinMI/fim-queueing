import { h, Fragment } from 'preact';
import { Event } from '../../types';
import MenuBar from '../MenuBar';
import styles from './styles.scss';

type PlayoffBracketProps = {
  event: Event,
  season: number,
  playoffMatches: any,
};

type MatchupSide = {
  alliance: number,
  teams: string,
  wins: number
};

type Matchup = {
  name: string,
  red: MatchupSide | null,
  blue: MatchupSide | null
};

const PlayoffBracket = ({ event, season }: PlayoffBracketProps) => {
  const bracket = {
    qf: [
      [
        {
          name: 'QF1',
          red: {
            alliance: 1,
            teams: '1, 2, 3',
            wins: 1,
          },
          blue: {
            alliance: 8,
            teams: '4, 5, 6',
            wins: 2,
          },
        },
        {
          name: 'QF2',
          red: {
            alliance: 2,
            teams: '1, 2, 3',
            wins: 0,
          },
          blue: {
            alliance: 7,
            teams: '4, 5, 6',
            wins: 1,
          },
        },
      ],
      [
        {
          name: 'QF1',
          red: {
            alliance: 1,
            teams: '1, 2, 3',
            wins: 1,
          },
          blue: {
            alliance: 8,
            teams: '4, 5, 6',
            wins: 2,
          },
        },
        {
          name: 'QF2',
          red: {
            alliance: 2,
            teams: '1, 2, 3',
            wins: 0,
          },
          blue: {
            alliance: 7,
            teams: '4, 5, 6',
            wins: 1,
          },
        },
      ],
    ],
    sf: [
      [
        {
          name: 'SF1',
          red: {
            alliance: 8,
            teams: '1, 2, 3',
            wins: 0,
          },
          blue: null,
        },
        {
          name: 'SF2',
          red: {
            alliance: 8,
            teams: '1, 2, 3',
            wins: 0,
          },
          blue: null,
        },
      ],
    ],
    f: {
      name: 'Finals',
      red: null,
      blue: null,
    },
  };

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

  const Matchup = ({ match: { name, red, blue } }: { match: Matchup }) => (
    <div className={styles.matchup}>
      <span className={styles.matchName}>{name}</span>
      <div className={styles.participants}>
        <MatchupSide color="red" side={red} />
        <MatchupSide color="blue" side={blue} />
      </div>
    </div>
  );
  return (
    <div>
      <MenuBar event={event} season={season} />
      <div className={styles.bracket}>
        <section className={[styles.round, styles.quarterfinals].join(' ')}>
          {bracket.qf.map(([match1, match2]) => (
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
          {bracket.sf.map(([match1, match2]) => (
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
              <Matchup match={bracket.f} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlayoffBracket;
