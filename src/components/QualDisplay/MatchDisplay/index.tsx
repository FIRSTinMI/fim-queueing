import { h, Fragment } from 'preact';
import { DriverStation, QualMatch } from '@shared/DbTypes';
import styles from './styles.module.scss';
import { Match } from "@/hooks/supabase/useGetMatches";

type MatchDisplayProps = {
  match: Match | null;
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
        <span className={styles.matchNumber}>{match.match_number}</span>
        <span className={styles.red}>
          {match.red_alliance_teams?.map((t, i) => <TeamDisplay key={`${match?.id}r${i}`} team={t} />)}
        </span>
        <span className={styles.blue}>
          {match.blue_alliance_teams?.map((t, i) => <TeamDisplay key={`${match?.id}b${i}`} team={t} />)}
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
