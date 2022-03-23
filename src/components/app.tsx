import { Component, createRef, h } from 'preact';

import { Match, ScheduleService, TeamAvatars } from '../services/scheduleService';
import MatchDisplay from './matchDisplay';
import styles from "./app.scss";

type AppMode = "automatic" | "assisted";

type AppState = {
    loadingState: "loading" | "ready" | "error" | "noAutomatic";
    mode: AppMode;
    matchNumber: number | null;
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
            mode: "automatic",
            matchNumber: null,
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
            this.setupAutomaticMode();
        });
    }

    componentDidMount(): void {
        if (typeof document === undefined) return;
        document.addEventListener("keydown", this.handleKeyPress.bind(this));
    }

    private async updateMatches(matchNumber: number, force = false): Promise<void> {
        if (this.state.mode === "assisted") {
            this._scheduleService.sendMatchNumber(matchNumber).catch((e) => {
                console.warn("Failed to send match number in assisted mode. Continuing.", e);
            });
        }

        try {
            if (force || matchNumber !== this.state.currentMatch?.matchNumber)
            {
                console.log("Match number changed, updating state");
                this.setState({
                    matchNumber,
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

    private setupAutomaticMode(): void {
        this.fetchCurrentMatch().finally(() => {
            this._updateInterval = window.setInterval(() => this.fetchCurrentMatch(), 1000);
        });
    }

    private tearDownAutomaticMode(): void {
        if (this._updateInterval) window.clearInterval(this._updateInterval);
    }

    private async fetchCurrentMatch(): Promise<void> {
        try {
            const matchNumber = await this._scheduleService.getCurrentMatch();
            await this.updateMatches(matchNumber);
        } catch (e) {
            this.setState({
                loadingState: "noAutomatic"
            });
        }
    }

    handleKeyPress(e: KeyboardEvent): void {
        switch (e.code) {
            case "KeyA":
                this.swapMode();
                break;
            case "ArrowLeft":
                this.decrementMatchNumber();
                break;
            case "ArrowRight":
                this.incrementMatchNumber();
                break;
        }
        return;
    }

    private swapMode(mode: AppMode | null = null): void {
        if (mode === null) mode = this.state.mode === "assisted" ? "automatic" : "assisted";
        if (mode === "assisted") {
            this.tearDownAutomaticMode();
            if (this.state.loadingState === "noAutomatic" || this.state.matchNumber === null) {
                this.updateMatches(1, true);
            }
            this.setState({
                mode: "assisted"
            });
        } else if (mode === "automatic") {
            this.setupAutomaticMode();
            this.setState({
                mode: "automatic"
            });
        }
    }

    private incrementMatchNumber(): void {
        if (this.state.mode !== "assisted") return;
        const matchNumber = this.state.matchNumber ?? 0;
        this.updateMatches(matchNumber + 1);
    }

    private decrementMatchNumber(): void {
        if (this.state.mode !== "assisted") return;
        const matchNumber = this.state.matchNumber ?? 0;
        this.updateMatches(matchNumber - 1);
    }

    componentWillUnmount(): void {
        this.tearDownAutomaticMode();
        if (typeof document !== undefined) document.removeEventListener("keypress", this.handleKeyPress.bind(this));
    }

    render(): JSX.Element {
        return (
            <div id="preact_root" class={styles.app}>
                <div>
                    {this.state.loadingState == "loading" && <div class={styles.infoText}>Loading matches...</div>}
                    {this.state.loadingState == "error" && <div class={styles.infoText}>Failed to fetch matches</div>}
                    {this.state.loadingState == "noAutomatic" && <div class={styles.infoText}>Unable to run in automatic mode. Press the 'a' key to switch modes.</div>}
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
            </div>
        );
    }
}
