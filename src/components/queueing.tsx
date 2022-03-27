import { Component, h } from "preact";
import Cookies from "js-cookie";

import { Event, AppMode } from "./app";
import { Match, TeamAvatars } from "../services/scheduleService";
import MatchDisplay from "./matchDisplay";
import styles from "./queueing.scss";
import { DatabaseReference, getDatabase, onValue, ref, set, update } from "firebase/database";

type QueueingProps = {
    event: Event;
    matches?: Match[];
    season: number;
};

type QueueingState = {
    loadingState: "loading" | "ready" | "error" | "noAutomatic";
    currentMatch: Match | null;
    nextMatch: Match | null;
    queueingMatches: Match[];
    teamAvatars?: TeamAvatars;
};

export default class Queueing extends Component<QueueingProps, QueueingState> {
    private _eventRef: DatabaseReference;

    constructor(props: QueueingProps) {
        super(props);
        this.state = {
            loadingState: "loading",
            currentMatch: null,
            nextMatch: null,
            queueingMatches: [],
            teamAvatars: undefined
        };

        const token = Cookies.get("queueing-event-key")
        if (!token) throw new Error("Token was somehow empty.");

        this._eventRef = ref(getDatabase(), `/events/${props.season}/${token}`);

        onValue(ref(getDatabase(), `/events/${props.season}/avatars`), (snap) => {
            this.setState({
                teamAvatars: snap.val()
            });
        });
    }

    componentDidMount(): void {
        if (typeof document === undefined) return;
        document.addEventListener("keydown", this.handleKeyPress.bind(this));

        this.updateMatches();
    }

    componentDidUpdate(prevProps: QueueingProps): void {
        if (prevProps.event.currentMatchNumber !== this.props.event.currentMatchNumber)
            this.updateMatches();
    }

    private getMatchByNumber(matchNumber: number): Match | null {
        return this.props.matches?.find(x => x.matchNumber == matchNumber) ?? null;
    }

    private updateMatches(): void {
        const matchNumber = this.props.event.currentMatchNumber;

        if (matchNumber === null || matchNumber === undefined) {
            //this.swapMode("assisted"); Not too sure about swapping. Let's just give it a match number for now.
            update(this._eventRef, {
                currentMatchNumber: 1
            });
            return;
        }

        try {
            console.log("Match number changed, updating state");
            this.setState({
                currentMatch: this.getMatchByNumber(matchNumber),
                nextMatch: this.getMatchByNumber(matchNumber + 1),
                // By default, we'll take the three matches after the one on deck
                queueingMatches: [2, 3, 4].map(x => this.getMatchByNumber(matchNumber + x)).filter(x => x !== null) as Match[],
                loadingState: "ready"
            });
        } catch (e) {
            this.setState({
                loadingState: "error"
            });
            console.error(e);
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
        if (mode === null) mode = this.props.event.mode === "assisted" ? "automatic" : "assisted";
        if (mode === "assisted") {
            if (this.state.loadingState === "noAutomatic" || this.props.event.currentMatchNumber === null) {
                this.updateMatches();
            }
            update(this._eventRef, {
                mode: "assisted"
            });
        } else if (mode === "automatic") {
            update(this._eventRef, {
                mode: "automatic"
            });
        }
    }

    private incrementMatchNumber(): void {
        if (this.props.event.mode !== "assisted") return;
        const matchNumber = this.props.event.currentMatchNumber ?? 0;
        update(this._eventRef, {
            currentMatchNumber: matchNumber + 1
        });
    }

    private decrementMatchNumber(): void {
        if (this.props.event.mode !== "assisted") return;
        const matchNumber = this.props.event.currentMatchNumber ?? 0;
        update(this._eventRef, {
            currentMatchNumber: matchNumber - 1
        });
    }

    onLogout(): void {
        if (!confirm("Are you sure you want to log out?")) return;
        Cookies.remove("queueing-event-key")
        window.location.reload();
    }

    componentWillUnmount(): void {
        if (typeof document !== undefined) document.removeEventListener("keypress", this.handleKeyPress.bind(this));
    }

    render(): JSX.Element {
        return (
            <div>
                <div class={styles.menu}>
                    <div class={styles.actions}>
                        <div>
                            <label>Mode:</label>

                            {/* @ts-ignore */}
                            <select value={this.props.event.mode} onInput={(e): void => this.swapMode(e.target.value)}>
                                <option value="automatic">Automatic</option>
                                <option value="assisted">Assisted</option>
                            </select>
                        </div>
                        <span>{this.props.event.name} ({this.props.season})</span>
                        <button onClick={(): void => this.onLogout()}>Log out</button>
                    </div>
                    <span>Scroll the page down to hide this menu</span>
                </div>
                {this.state.loadingState == "loading" && <div class={styles.infoText}>Loading matches...</div>}
                {this.state.loadingState == "error" && <div class={styles.infoText}>Failed to fetch matches</div>}
                {this.state.loadingState == "noAutomatic" && <div class={styles.infoText}>Unable to run in automatic mode. Press the 'a' key to switch modes.</div>}
                {this.state.loadingState == "ready" && !this.props.matches?.length && <div class={styles.infoText}>Waiting for schedule to be posted...</div>}
                {this.state.loadingState == "ready" && this.props.matches?.length &&
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