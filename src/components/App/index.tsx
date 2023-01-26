import { h } from 'preact';
import Cookies from 'js-cookie';
import { initializeApp } from 'firebase/app';
import {
  Database,
  DataSnapshot,
  get, getDatabase, off, onValue, ref,
} from 'firebase/database';
import {
  Analytics, getAnalytics, setUserProperties,
} from 'firebase/analytics';
import { Router, Route } from 'preact-router';
import { useEffect, useState } from 'preact/hooks';

import QualQueueing from '../QualDisplay/Queueing';
import LoginForm from '../LoginForm';
import { Event } from '../../types';
import AnalyticsService from '../../analyticsService';
import styles from './styles.scss';
import ScreenChooser from '../ScreenChooser';
import TeamRankings from '../RankingDisplay/TeamRankings';
import PlayoffBracket from '../PlayoffBracket';
import AppContext, { AppContextType } from '../../appContext';

const App = () => {
  const [db, setDb] = useState<Database>();
  const [analytics, setAnalytics] = useState<Analytics>();
  const [connection, setConnection] = useState<{
    connectionStatus?: 'online' | 'offline', lastConnectedDate?: Date
  }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [appContext, setAppContext] = useState<AppContextType>({});

  const onLogin = (token?: string) => {
    if (appContext === undefined) throw new Error('appContext was undefined');
    if (db === undefined) throw new Error('aaa db was undefined');

    setIsAuthenticated(true);

    onValue(ref(db, `/seasons/${appContext.season}/events/${token}`), (snap) => {
      setAppContext({
        event: snap.val() as Event,
        token,
        ...appContext,
      });
    });

    AnalyticsService.logEvent('login', { eventKey: token });
    if (analytics !== undefined) {
      setUserProperties(analytics, { eventKey: token });
    }
  };

  useEffect(() => {
    if (appContext.token === undefined) return;
    onLogin(appContext.token);
  }, [appContext.token]);

  useEffect(() => {
    console.log('Running initialization...');
    const firebaseConfig = {
      apiKey: process.env.PREACT_APP_FIRE_KEY,
      databaseURL: process.env.PREACT_APP_RTDB_URL,
      projectId: process.env.PREACT_APP_FIRE_PROJ,
      appId: process.env.PREACT_APP_FIRE_APPID,
      measurementId: process.env.PREACT_APP_FIRE_MEASUREID,
    };

    initializeApp(firebaseConfig);
    const newDb = getDatabase();
    setDb(newDb);
    const newAnalytics = getAnalytics();
    setAnalytics(newAnalytics);

    // Give things a chance to load before we warn about network connectivity, up to two seconds
    const connRef = ref(newDb, '.info/connected');
    let connTimeoutRunning = true;
    const connTimeout = window.setTimeout(() => {
      connTimeoutRunning = false;
      setConnection({
        connectionStatus: 'offline',
        lastConnectedDate: new Date(),
      });
    }, 2000);

    if (newDb === undefined) throw new Error('This is bad');
    onValue(connRef, (snap) => {
      const isConnected = snap.val();
      if (isConnected) {
        clearTimeout(connTimeout);
        connTimeoutRunning = false;
      }
      if (connTimeoutRunning) return;
      console.log('connection', isConnected);
      setConnection({
        connectionStatus: isConnected ? 'online' : 'offline',
        lastConnectedDate: connection?.connectionStatus && !isConnected ? new Date() : undefined,
      });
    });

    // console.log(await installations.getId(installations.getInstallations()));
    get(ref(newDb, '/current_season')).then((seasonData: DataSnapshot) => {
      if (!seasonData || !seasonData.exists) {
        throw new Error('Unable to get season...');
      }

      const season = Number.parseInt(seasonData.val(), 10);
      const token = Cookies.get('queueing-event-key');

      setAppContext({
        season,
        token,
        ...appContext,
      });
    });

    return () => { off(connRef); };
  }, []);

  let appContent: JSX.Element;
  if (!appContext || (!isAuthenticated && connection?.connectionStatus === undefined)
      || (isAuthenticated && appContext.event === undefined)) {
    appContent = (<div className={styles.infoText}>Loading...</div>);
  } else if (isAuthenticated && appContext.event !== undefined) {
    appContent = (
      <Router>
        <Route default component={ScreenChooser} />
        <Route component={QualQueueing} path="/qual/queueing" />
        <Route component={TeamRankings} path="/rankings" />
        <Route component={PlayoffBracket} path="/playoff/bracket" />
      </Router>
    );
  } else {
    appContent = (<LoginForm onLogin={onLogin} />);
  }
  return (
    <div id="preact_root" className={styles.app}>
      <AppContext.Provider value={appContext ?? {}}>
        { connection?.connectionStatus === 'offline' && <div className={styles.warningBar}>Check network connection. {connection.lastConnectedDate && `Last connected ${connection.lastConnectedDate?.toLocaleString([], { timeStyle: 'short' })}`}</div> }
        { appContent }
      </AppContext.Provider>
    </div>
  );
};

export default App;
