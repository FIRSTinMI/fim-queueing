import { h, Fragment } from 'preact';
import { Match, Team, TeamAvatars } from '../../../types';
import styles from './styles.scss';

type MatchDisplayProps = {
  match: Match | null;
  // Temp disable till I figure out what to do with avatars
  // eslint-disable-next-line react/no-unused-prop-types
  teamAvatars: TeamAvatars | undefined;
  halfWidth?: boolean;
  className?: string;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getAvatarForTeam(avatars: TeamAvatars | undefined, teamNumber: number | undefined)
  : string | null {
  if (avatars === undefined || teamNumber === undefined || !avatars[teamNumber] || avatars[teamNumber] === 'NONE') return null;
  const avatar = avatars[teamNumber];
  if (avatar === undefined) return null;
  return avatar;
}

type TeamDisplayProps = {
  team: Team | undefined;
};
function TeamDisplay({ team }: TeamDisplayProps): JSX.Element {
  if (team === undefined) return (<div />);
  // const avatar = getAvatarForTeam(props.teamAvatars, team.teamNumber);
  return (
    <div>
      {/* <span class={styles.avatar}>
        {avatar && <img src={`data:image/png;base64,${avatar}`} />}
      </span> */}
      {team.teamNumber}
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
        <span className={styles.matchNumber}>{match.matchNumber}</span>
        <span className={styles.red}>
          {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.matchNumber}r${n}`} team={match?.teams.find((x) => x.station === `Red${n}`)} />)}
        </span>
        <span className={styles.blue}>
          {[1, 2, 3].map((n) => <TeamDisplay key={`${match?.matchNumber}b${n}`} team={match?.teams.find((x) => x.station === `Blue${n}`)} />)}
        </span>
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
