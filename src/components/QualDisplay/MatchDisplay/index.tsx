import { h, Fragment } from 'preact';
import { DriverStation, QualBreak, QualMatch } from '@shared/DbTypes';
import styles from './styles.module.scss';

type MatchDisplayProps = {
  match: QualMatch | QualBreak | null;
  // Temp disable till I figure out what to do with avatars
  // teamAvatars: TeamAvatars | undefined;
  halfWidth?: boolean;
  className?: string;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function getAvatarForTeam(avatars: TeamAvatars | undefined, teamNumber: number | undefined)
//   : string | null {
//   if (avatars === undefined || teamNumber === undefined
// || !avatars[teamNumber] || avatars[teamNumber] === 'NONE') return null;
//   const avatar = avatars[teamNumber];
//   if (avatar === undefined) return null;
//   return avatar;
// }

type TeamDisplayProps = {
  team: number | undefined;
};
function TeamDisplay({ team }: TeamDisplayProps): JSX.Element {
  if (team === undefined) return (<div />);
  // const avatar = getAvatarForTeam(props.teamAvatars, team.teamNumber);
  return (
    <div>
      {/* <span class={styles.avatar}>
        {avatar && <img src={`data:image/png;base64,${avatar}`} />}
      </span> */}
      {team}
    </div>
  );
}

function MatchDisplay({ halfWidth, match, className }: MatchDisplayProps): JSX.Element {
  return (
    <div className={`${styles.matchDisplay} ${halfWidth === true ? styles.halfWidth : ''} ${className ?? ''}`}>
      {/*
        Just show a blank entry if the match doesn't exist.
        Either we're in a test match or at the end of the schedule
      */}
      {match && (
        <>
          {match && match.type === 'break' && (
            <div className={styles.break}>{match.description}</div>
          )}
          {match?.type !== 'break' && (
            <>
              <span className={styles.matchNumber}>{match.number}</span>
              <span className={styles.red}>
                {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.number}r${n}`} team={match?.participants[`Red${n}` as DriverStation]} />)}
              </span>
              <span className={styles.blue}>
                {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.number}b${n}`} team={match?.participants[`Blue${n}` as DriverStation]} />)}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}

MatchDisplay.defaultProps = {
  halfWidth: false,
  className: '',
};

export default MatchDisplay;
