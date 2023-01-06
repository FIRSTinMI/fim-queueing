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
import { Router, Route, route } from 'preact-router';

import QualQueueing from '../QualDisplay/Queueing';
import LoginForm from '../LoginForm';
import { Event, Match } from '../../types';
import AnalyticsService from '../../analyticsService';
import styles from './styles.scss';
import ScreenChooser from '../ScreenChooser';
import TeamRankings from '../RankingDisplay/TeamRankings';
import PlayoffBracket from '../PlayoffBracket';

type AppState = {
  isAuthenticated: boolean;
  event?: Event;
  matches?: Match[];
  season?: number;
  connectionStatus?: 'online' | 'offline';
  lastConnectedDate?: Date;
};

export default class App extends Component<{}, AppState> {
  private db: Database;

  private analytics: Analytics;

  private pendingRedirect?: string = undefined;

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
    // Give things a chance to load before we warn about network connectivity
    window.setTimeout(() => {
      onValue(ref(this.db, '.info/connected'), (snap) => {
        const isConnected = snap.val();
        console.log('connection', isConnected);
        this.setState((prevState) => ({
          connectionStatus: isConnected ? 'online' : 'offline',
          lastConnectedDate: prevState.connectionStatus && !isConnected ? new Date() : undefined,
        }));
      });
    }, 2000);

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
    const lastLocation = Cookies.get('queueing-last-route');
    if (lastLocation !== undefined) {
      this.pendingRedirect = lastLocation;
    }
  }

  /**
   * Save the user's latest route to a cookie so we can automatically redirect them back next time
   * @param e Route change event
   * @returns void
   */
  handleRoute = async (e: any) => {
    if (this.pendingRedirect !== undefined) {
      // Weird race condition things...
      window.setTimeout(() => route(this.pendingRedirect!, false), 0);
      this.pendingRedirect = undefined;
      return;
    }

    const cookieExpirationDate = new Date();
    cookieExpirationDate.setDate(cookieExpirationDate.getDate() + 3);
    Cookies.set('queueing-last-route', e.url, {
      expires: cookieExpirationDate,
    });
  };

  render(): JSX.Element {
    const {
      isAuthenticated, event, season, matches, connectionStatus, lastConnectedDate,
    } = this.state;
    return (
      <div id="preact_root" className={styles.app}>
        { connectionStatus === 'offline' && <div className={styles.warningBar}>Check network connection. {lastConnectedDate && `Last connected ${lastConnectedDate?.toLocaleString([], { timeStyle: 'short' })}`}</div> }
        { isAuthenticated && event == null && <div className={styles.infoText}>Loading...</div> }
        { event != null && isAuthenticated && (
          <Router onChange={this.handleRoute}>
            <Route default component={ScreenChooser} event={event} season={season ?? 9999} />
            <Route component={QualQueueing} path="/qual/queueing" event={event} qualMatches={matches} season={season ?? 9999} />
            <Route component={TeamRankings} path="/rankings" event={event} season={season ?? 9999} />
            <Route component={PlayoffBracket} path="/playoff/bracket" event={event} playoffMatches={matches} season={season ?? 9999} />
          </Router>
        ) }
        { !isAuthenticated && <LoginForm season={season ?? 9999} onLogin={this.onLogin} /> }
      </div>
    );
  }
}
