import { h, Fragment } from 'preact';
import { DriverStation } from '../../../../shared/DbTypes';
import { ParticipantSource } from '../../../../shared/DoubleEliminationBracketMapping';
import { PlayoffMatchDisplay } from '../PlayoffMatchDisplay';
import styles from './styles.scss';

type MatchDisplayProps = {
  match: PlayoffMatchDisplay | null;
  // Temp disable till I figure out what to do with avatars
  // teamAvatars: TeamAvatars | undefined;
  halfWidth?: boolean;
  className?: string;
};

function TeamDisplay({ teamNumber }: { teamNumber: number | undefined }): JSX.Element {
  if (teamNumber === undefined) return (<div />);
  return (
    <div>
      {teamNumber}
    </div>
  );
}

function MatchDisplay({ halfWidth, match, className }: MatchDisplayProps): JSX.Element {
  if (match?.customDisplayText) {
    return (
      <div className={`${styles.matchDisplay} ${halfWidth === true ? styles.halfWidth : ''} ${className ?? ''}`}>
        {/* <span className={styles.matchNumber} /> */}
        <div style={{ gridRow: '1 / span 2', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {match.customDisplayText}
        </div>
      </div>
    );
  }
  function getGenericText(part: ParticipantSource | undefined): JSX.Element {
    if (part === undefined) return (<></>);

    if ('winnerFrom' in part) {
      return (<>Winner of M{part.winnerFrom}</>);
    }
    if ('loserFrom' in part) {
      return (<>Loser of M{part.loserFrom}</>);
    }
    if ('allianceNumber' in part) {
      return (<>Alliance {part.allianceNumber}</>);
    }
    throw new Error('ParticipantSource not as expected');
  }

  let redContent: JSX.Element;
  let blueContent: JSX.Element;
  if (match?.result?.participants?.Red1) {
    redContent = (
      <span className={[styles.red, styles.teamNums].join(' ')}>
        <span>A{match.result.redAlliance}</span>
        {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.num}r${n}`} teamNumber={match.result?.participants[`Red${n}` as DriverStation]} />)}
      </span>
    );
  } else {
    redContent = (
      <span className={styles.red}>
        {getGenericText(match?.match?.participants.red)}
      </span>
    );
  }
  if (match?.result?.participants?.Blue1) {
    blueContent = (
      <span className={[styles.blue, styles.teamNums].join(' ')}>
        <span>A{match.result.blueAlliance}</span>
        {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.num}b${n}`} teamNumber={match.result?.participants[`Blue${n}` as DriverStation]} />)}
      </span>
    );
  } else {
    blueContent = (
      <span className={styles.blue}>
        {getGenericText(match?.match?.participants.blue)}
      </span>
    );
  }
  return (
    <div className={`${styles.matchDisplay} ${halfWidth === true ? styles.halfWidth : ''} ${className ?? ''}`}>
      {/*
        Just show a blank entry if the match doesn't exist.
        Either we're in a test match or at the end of the schedule
      */}
      <>
        <span className={styles.matchNumber}>{match?.num === 'F' ? 'F' : `M${match?.num}`}</span>
        {redContent}
        {/* <span className={styles.blue}> */}
          {blueContent}
        {/* </span> */}
      </>
    </div>
  );
}

MatchDisplay.defaultProps = {
  halfWidth: false,
  className: '',
};

export default MatchDisplay;
