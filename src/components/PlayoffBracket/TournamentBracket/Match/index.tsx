import { Fragment, FunctionalComponent, h } from 'preact';

import { ParticipantSource } from '@shared/DoubleEliminationBracketMapping';
import { DriverStation, PlayoffMatch } from '@shared/DbTypes';
import { Alliance } from '@/types';
import styles from './styles.scss';

export type MatchComponentProps = {
  matchName: string,
  matchResult: PlayoffMatch | undefined,
  red: ParticipantSource,
  blue: ParticipantSource,
  alliances: Alliance[]
};

const Match: FunctionalComponent<MatchComponentProps> = ({
  matchName,
  matchResult,
  red,
  blue,
  alliances,
}: MatchComponentProps) => {
  const getTeamsInAlliance = (num: number): string => {
    const alliance = alliances?.find((a) => a.number === num);
    if (!alliance) return '';
    return `${alliance.captain}, ${alliance.round1}, ${alliance.round2}`;
  };

  const getTeamDisplay = (team: ParticipantSource, color: 'red' | 'blue') => {
    // If we do know exactly who will be in the match
    if (color === 'red' && (matchResult?.redAlliance !== undefined || matchResult?.participants?.Red1 !== undefined)) {
      return (
        <>
          <b>A{matchResult.redAlliance ?? '?'}</b>: {(['Red1', 'Red2', 'Red3'] as DriverStation[]).map((m) => (matchResult?.participants ?? {})[m] ?? '?').join(', ')}
        </>
      );
    }
    if (color === 'blue' && (matchResult?.blueAlliance !== undefined || matchResult?.participants?.Blue1 !== undefined)) {
      return (
        <>
          <b>A{matchResult.blueAlliance ?? '?'}</b>: {(['Blue1', 'Blue2', 'Blue3'] as DriverStation[]).map((m) => (matchResult?.participants ?? {})[m] ?? '?').join(', ')}
        </>
      );
    }
    if ('allianceNumber' in team) {
      // This *shouldn't* happen. The FRC API should immediately be populating team numbers...
      // But just in case
      return (<><b>A{team.allianceNumber}</b> {getTeamsInAlliance(team.allianceNumber)}</>);
    }

    // If we don't yet know who will be in a match
    if ('winnerFrom' in team) {
      return (<>Winner of M{team.winnerFrom}</>);
    }
    if ('loserFrom' in team) {
      return (<>Loser of M{team.loserFrom}</>);
    }
    throw new Error('ParticipantSource did not match any expected formats');
  };

  return (
    <div className={styles.wrapper}>
      {matchName && (
        <div>
          <p className={styles.topText}>{matchName}</p>
          <div className={styles.line} />
        </div>
      )}
      <div className={styles.styledMatch}>
        <div className={[styles.side, styles.red].join(' ')}>
          <div>{getTeamDisplay(red, 'red')}</div>
          <div className={styles.score}>
            {matchResult?.winner === 'red' && (<img alt="Check" src="/assets/check.svg" />)}
          </div>
        </div>
        <div className={styles.line} />
        <div className={[styles.side, styles.blue].join(' ')}>
          <div>{getTeamDisplay(blue, 'blue')}</div>
          <div className={styles.score}>
            {matchResult?.winner === 'blue' && (<img alt="Check" src="/assets/check.svg" />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Match;
