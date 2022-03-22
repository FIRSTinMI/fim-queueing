import { Component, h } from 'preact';

import { Match, ScheduleService, TeamAvatars } from '../services/scheduleService';
import MatchDisplay from './matchDisplay';
import styles from "./app.scss";

type AppState = {
    isLoading: boolean;
    currentMatch?: Match;
    nextMatch?: Match;
    queueingMatches?: Match[];
    teamAvatars?: TeamAvatars;
}

export default class App extends Component<{}, AppState> {
    private _scheduleService: ScheduleService;
    private _updateInterval?: number;

    constructor(props: {}) {
        super(props);
        this.state = {
            isLoading: true,
            currentMatch: undefined,
            nextMatch: undefined,
            queueingMatches: undefined,
            teamAvatars: undefined
        };
        console.log("Initializing");
        this._scheduleService = new ScheduleService();

        this._scheduleService.updateSchedule().then(() => {
            this._scheduleService.updateAvatars().then((x) => {
                this.setState({
                    teamAvatars: x
                });
            })
            this.updateMatches().then(() => {
                this.setState({
                    isLoading: false
                });
        
                this._updateInterval = window.setInterval(() => this.updateMatches(), 1000);
            });
        });
    }

    private async updateMatches(): Promise<void> {
        const matchNumber = Number.parseInt(await (await fetch("/currentMatch.txt")).text(), 10);
        if (Number.isNaN(matchNumber)) throw new Error("Unable to get current match");
        if (matchNumber !== this.state.currentMatch?.matchNumber)
        {
            console.log("Match number changed, updating state");
            this.setState({
                currentMatch: this._scheduleService.getMatchByNumber(matchNumber),
                nextMatch: this._scheduleService.getMatchByNumber(matchNumber + 1),
                queueingMatches: [2, 3, 4].map(x => this._scheduleService.getMatchByNumber(matchNumber + x))
            });
        }
    }

    componentWillUnmount(): void {
        if (this._updateInterval) window.clearInterval(this._updateInterval);
    }

    render(): JSX.Element {
        return (
            <div id="preact_root" class={styles.app}>
                {this.state.isLoading && <div>Loading matches...</div>}
                {!this.state.isLoading &&
                    <div class={styles.matches}>
                        <div class={styles.topBar}>
                            <div>{this.state.currentMatch && <MatchDisplay match={this.state.currentMatch} teamAvatars={this.state.teamAvatars} />}<span class={styles.description}>On Field</span></div>
                            <div>{this.state.nextMatch && <MatchDisplay match={this.state.nextMatch} teamAvatars={this.state.teamAvatars} />}<span class={styles.description}>On Deck</span></div>
                        </div>
                        {this.state.queueingMatches?.map(x => <MatchDisplay match={x} key={x.matchNumber} teamAvatars={this.state.teamAvatars} />)}
                    </div>
                }
            </div>
        );
    }
}
