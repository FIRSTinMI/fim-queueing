import { Component, h } from 'preact';
import Cookies from 'js-cookie';
import { initializeApp } from 'firebase/app';
import {
  Database,
  get, getDatabase, onValue, ref,
} from 'firebase/database';
import {
  Analytics, getAnalytics, setUserProperties,
} from 'firebase/analytics';

import Queueing from '../QualDisplay/Queueing';
import LoginForm from '../LoginForm';
import { Event, Match } from '../../types';
import AnalyticsService from '../../analyticsService';
import styles from './styles.scss';

type AppState = {
  isAuthenticated: boolean;
  event?: Event;
  matches?: Match[];
  season?: number;
};

export default class App extends Component<{}, AppState> {
  private db: Database;

  private analytics: Analytics;

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
      measurementId: process.env.PREACT_APP_FIRE_MEASUREID,
    };

    initializeApp(firebaseConfig);
    this.db = getDatabase();
    this.analytics = getAnalytics();
  }

  async componentDidMount() {
    const seasonData = await get(ref(this.db, '/current_season'));
    if (!seasonData || !seasonData.exists) {
      throw new Error('Unable to get season...');
    }

    const season = Number.parseInt(seasonData.val(), 10);

    this.setState({
      season,
    });

    const token = Cookies.get('queueing-event-key');

    if (token !== undefined) {
      this.setState({
        isAuthenticated: true,
      });

      this.onLogin(token, season);
    }
  }

  /**
     * This should only be called once
     * @param token Event key
     */
  async onLogin(token: string, season: number): Promise<void> {
    this.setState({
      isAuthenticated: true,
    });

    onValue(ref(this.db, `/seasons/${season}/events/${token}`), (snap) => {
      this.setState({
        event: snap.val() as Event,
      });
    });

    onValue(ref(this.db, `/seasons/${season}/matches/${token}`), (snap) => {
      this.setState({
        matches: snap.val() as Match[],
      });
    });

    AnalyticsService.logEvent('login', { eventKey: token });
    setUserProperties(this.analytics, { eventKey: token });
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
