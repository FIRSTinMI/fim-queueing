import { Component, h } from 'preact';
import Cookies from 'js-cookie';
import { initializeApp } from 'firebase/app';
import {
  get, getDatabase, onValue, ref,
} from 'firebase/database';

import styles from './app.scss';
import Queueing from './queueing';
import LoginForm from './LoginForm';
import { Event, Match } from '../types';

type AppState = {
  isAuthenticated: boolean;
  event?: Event;
  matches?: Match[];
  season?: number;
};

export default class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isAuthenticated: false,
    };
    console.log('Initializing');

    this.onLogin = this.onLogin.bind(this);

    const firebaseConfig = {
      apiKey: process.env.PREACT_APP_FIRE_KEY,
      databaseURL: process.env.PREACT_APP_RTDB_URL,
      projectId: process.env.PREACT_APP_FIRE_PROJ,
      appId: process.env.PREACT_APP_FIRE_APPID,
    };

    initializeApp(firebaseConfig);

    const token = Cookies.get('queueing-event-key');

    if (token !== undefined) {
      this.setState({
        isAuthenticated: true,
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
      isAuthenticated: true,
    });

    const db = getDatabase();

    const seasonData = await get(ref(db, '/current_season'));
    if (!seasonData || !seasonData.exists) {
      throw new Error('Unable to get season...');
    }

    const season = Number.parseInt(seasonData.val(), 10);

    this.setState({
      season,
    });

    onValue(ref(db, `/seasons/${season}/events/${token}`), (snap) => {
      this.setState({
        event: snap.val() as Event,
      });
    });

    onValue(ref(db, `/seasons/${season}/matches/${token}`), (snap) => {
      this.setState({
        matches: snap.val() as Match[],
      });
    });
  }

  render(): JSX.Element {
    const {
      isAuthenticated, event, season, matches,
    } = this.state;
    return (
      <div id="preact_root" className={styles.app}>
        <div>
          { isAuthenticated && event == null && <div className={styles.infoText}>Loading...</div>}
          { event != null && isAuthenticated
            && <Queueing event={event} matches={matches} season={season ?? 9999} /> }
          { !isAuthenticated && <LoginForm season={season ?? 9999} onLogin={this.onLogin} /> }
        </div>
      </div>
    );
  }
}
