import { h } from "preact";
import { Match, Team, TeamAvatars } from "../services/scheduleService";
import styles from "./matchDisplay.scss";

type MatchDisplayProps = {
    match: Match;
    teamAvatars: TeamAvatars | undefined;
}
function getAvatarForTeam(avatars: TeamAvatars | undefined, teamNumber: number | undefined): string | null {
    if (avatars == undefined || teamNumber == undefined) return null;
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
                <span class={styles.avatar}>{avatar && <img src={`data:image/png;base64,${getAvatarForTeam(props.teamAvatars, team.teamNumber)}`} />}</span>{team.teamNumber}
            </div>
        )
    }

    return (<div class={styles.matchDisplay}>
        <span class={styles.matchNumber}>{props.match.matchNumber}</span>
        <span class={styles.red}>
            <TeamDisplay team={props.match.teams.find(x => x.station == "Red1")} />
            <TeamDisplay team={props.match.teams.find(x => x.station == "Red2")} />
            <TeamDisplay team={props.match.teams.find(x => x.station == "Red3")} />
        </span>
        <span class={styles.blue}>
            <TeamDisplay team={props.match.teams.find(x => x.station == "Blue1")} />
            <TeamDisplay team={props.match.teams.find(x => x.station == "Blue2")} />
            <TeamDisplay team={props.match.teams.find(x => x.station == "Blue3")} />
        </span>
    </div>);
}