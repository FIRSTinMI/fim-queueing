import { h, Fragment } from "preact";
import { Match, Team, TeamAvatars } from "../services/scheduleService";
import styles from "./matchDisplay.scss";

type MatchDisplayProps = {
    match: Match | null;
    teamAvatars: TeamAvatars | undefined;
    halfWidth?: boolean;
}
function getAvatarForTeam(avatars: TeamAvatars | undefined, teamNumber: number | undefined): string | null {
    if (avatars == undefined || teamNumber == undefined || !avatars[teamNumber] || avatars[teamNumber] === "NONE") return null;
    const avatar = avatars[teamNumber];
    if (avatar == undefined) return null;
    return avatar;
}

type TeamDisplayProps = {
    team: Team | undefined;
}

export default function MatchDisplay(props: MatchDisplayProps): JSX.Element {
    function TeamDisplay({ team }: TeamDisplayProps): JSX.Element {
        if (team == undefined) return (<div />);
        const avatar = getAvatarForTeam(props.teamAvatars, team.teamNumber);
        return (
            <div>
                <span class={styles.avatar}>{avatar && <img src={`data:image/png;base64,${avatar}`} />}</span>{team.teamNumber}
            </div>
        )
    }

    return (<div class={`${styles.matchDisplay} ${props.halfWidth === true ? styles.halfWidth : ''}`}>
        {/* Just show a blank entry if the match doesn't exist. Either we're in a test match or at the end of the schedule */}
        {props.match && <Fragment>
            <span class={styles.matchNumber}>{props.match.matchNumber}</span>
            <span class={styles.red}>
                {[1, 2, 3].map(n => <TeamDisplay key={`${props.match?.matchNumber}r${n}`} team={props.match?.teams.find(x => x.station == `Red${n}`)} />)}
            </span>
            <span class={styles.blue}>
            {[1, 2, 3].map(n => <TeamDisplay key={`${props.match?.matchNumber}b${n}`} team={props.match?.teams.find(x => x.station == `Blue${n}`)} />)}
            </span>
        </Fragment>}
    </div>);
}