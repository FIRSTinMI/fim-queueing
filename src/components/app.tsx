import { Component, h } from 'preact';

import { Match, ScheduleService, TeamAvatars } from '../services/scheduleService';
import MatchDisplay from './matchDisplay';
import styles from "./app.scss";

type AppState = {
    loadingState: "loading" | "ready" | "error";
    currentMatch: Match | null;
    nextMatch: Match | null;
    queueingMatches: Match[];
    teamAvatars?: TeamAvatars;
}

export default class App extends Component<{}, AppState> {
    private _scheduleService: ScheduleService;
    private _updateInterval?: number;

    constructor(props: {}) {
        super(props);
        this.state = {
            loadingState: "loading",
            currentMatch: null,
            nextMatch: null,
            queueingMatches: [],
            teamAvatars: undefined
        };
        console.log("Initializing");
        this._scheduleService = new ScheduleService();

        this._scheduleService.updateSchedule().then(() => {
            this._scheduleService.updateAvatars().then((avatars) => {
                this.setState({
                    teamAvatars: avatars
                });
            }).catch(() => {
                // The app will work just fine without avatars
                console.error("Failed to fetch team avatars. Continuing without them.");
            });
            this.updateMatches().finally(() => {
                this._updateInterval = window.setInterval(() => this.updateMatches(), 1000);
            });
        });
    }

    private async updateMatches(): Promise<void> {
        try {
            const matchNumber = await this._scheduleService.getCurrentMatch();
            if (matchNumber !== this.state.currentMatch?.matchNumber)
            {
                console.log("Match number changed, updating state");
                this.setState({
                    currentMatch: this._scheduleService.getMatchByNumber(matchNumber),
                    nextMatch: this._scheduleService.getMatchByNumber(matchNumber + 1),
                    // By default, we'll take the three matches after the one on deck
                    queueingMatches: [2, 3, 4].map(x => this._scheduleService.getMatchByNumber(matchNumber + x)).filter(x => x !== null) as Match[],
                    loadingState: "ready"
                });
            }
        } catch (e) {
            this.setState({
                loadingState: "error"
            });
        }
    }

    componentWillUnmount(): void {
        if (this._updateInterval) window.clearInterval(this._updateInterval);
    }

    render(): JSX.Element {
        return (
            <div id="preact_root" class={styles.app}>
                {this.state.loadingState == "loading" && <div class={styles.infoText}>Loading matches...</div>}
                {this.state.loadingState == "error" && <div class={styles.infoText}>Failed to fetch matches</div>}
                {this.state.loadingState == "ready" &&
                    <div class={styles.matches}>
                        <div class={styles.topBar}>
                            {this.state.currentMatch && <div><MatchDisplay match={this.state.currentMatch} teamAvatars={this.state.teamAvatars} /><span class={styles.description}>On Field</span></div>}
                            {this.state.nextMatch && <div><MatchDisplay match={this.state.nextMatch} teamAvatars={this.state.teamAvatars} /><span class={styles.description}>On Deck</span></div>}
                        </div>
                        {this.state.queueingMatches.map(x => <MatchDisplay match={x} key={x.matchNumber} teamAvatars={this.state.teamAvatars} />)}
                    </div>
                }
            </div>
        );
    }
}
