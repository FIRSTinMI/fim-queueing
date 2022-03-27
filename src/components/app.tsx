import { Component, h } from 'preact';
import Cookies from 'js-cookie';
import { initializeApp } from 'firebase/app';
import { get, getDatabase, onValue, ref } from 'firebase/database';

import styles from "./app.scss";
import Queueing from './queueing';
import LoginForm from './LoginForm';
import { Match } from '../services/scheduleService';

export type AppMode = "automatic" | "assisted";

export type Event = {
    start: Date;
    end: Date;
    name: string;
    eventCode: string;
    currentMatchNumber: number | null;
    hasQualSchedule: boolean;
    mode: AppMode;
}

type AppState = {
    isAuthenticated: boolean;
    event?: Event;
    matches?: Match[];
    season?: number;
}

export default class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            isAuthenticated: false
        };
        console.log("Initializing");

        this.onLogin = this.onLogin.bind(this);

        const firebaseConfig = {
            apiKey: process.env.PREACT_APP_FIRE_KEY,
            databaseURL: process.env.PREACT_APP_RTDB_URL,
            projectId: process.env.PREACT_APP_FIRE_PROJ,
            appId: process.env.PREACT_APP_FIRE_APPID
          };
          
        initializeApp(firebaseConfig);

        const token = Cookies.get("queueing-event-key");

        if (token !== undefined) {
            this.setState({
                isAuthenticated: true
            });

            this.onLogin(token);
        }
    }

    /**
     * This should only be called once
     * @param token Event key
     */
    async onLogin(token: string): Promise<void> {
        this.setState({
            isAuthenticated: true
        });

        const db = getDatabase();

        const seasonData = await get(ref(db, '/current_season'));
        if (!seasonData || !seasonData.exists) {
            throw new Error("Unable to get season...");
        }

        const season = Number.parseInt(seasonData.val(), 10);

        this.setState({
            season
        });

        onValue(ref(db, `/seasons/${season}/events/${token}`), (snap) => {
            console.log('got event data', snap.val());
            this.setState({
                event: snap.val() as Event,
            }, () => console.log('new state from event', this.state));
        });

        onValue(ref(db, `/seasons/${season}/matches/${token}`), (snap) => {
            console.log('got match data', snap.val());
            this.setState({
                matches: snap.val() as Match[],
            }), () => console.log('new state from match', this.state);
        });
    }

    render(): JSX.Element {
        return (
            <div id="preact_root" class={styles.app}>
                <div>
                    { this.state.isAuthenticated && this.state.event == null && <div class={styles.infoText}>Loading...</div>}
                    { this.state.event != null && this.state.isAuthenticated && <Queueing event={this.state.event} matches={this.state.matches} season={this.state.season ?? 9999} /> }
                    { !this.state.isAuthenticated && <LoginForm onLogin={this.onLogin} /> }
                </div>
            </div>
        );
    }
}