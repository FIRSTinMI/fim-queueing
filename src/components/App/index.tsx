import { h } from 'preact';
import Cookies from 'js-cookie';
import { getApp, initializeApp } from 'firebase/app';
import {
  Database, DataSnapshot, get, getDatabase, off, onValue, ref,
} from 'firebase/database';
import {
  getId, getInstallations,
} from 'firebase/installations';
import {
  Router, Route, RouterOnChangeArgs, route as navigateToRoute,
} from 'preact-router';
import { useEffect, useState } from 'preact/hooks';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';

import styles from './styles.scss';
import QualQueueing from '../QualDisplay/Queueing';
import LoginForm from '../LoginForm';
import { Event } from '../../types';
import ScreenChooser from '../ScreenChooser';
import TeamRankings from '../RankingDisplay/TeamRankings';
import PlayoffBracket from '../PlayoffBracket';
import AppContext, { AppContextType } from '../../AppContext';
import PlayoffQueueing from '../PlayoffQueueing/Queueing';

// TODO: Figure out why the event details sometimes aren't getting sent over to SignalR

const App = () => {
  const [db, setDb] = useState<Database>();
  const [hub, setHub] = useState<HubConnection | undefined>();
  const [connection, setConnection] = useState<{
    connectionStatus?: 'online' | 'offline', lastConnectedDate?: Date
  }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [appContext, setAppContext] = useState<AppContextType>({});
  const [identifyTO, setIdentifyTO] = useState<ReturnType<typeof setTimeout> | null>(null);

  const sendCurrentStatus = async () => {
    if (hub?.state !== HubConnectionState.Connected) {
      console.log('Not connected to SignalR, not sending state');
      return;
    }

    console.log('Sending state to SignalR server', appContext);

    const info = {
      EventKey: appContext.token,
      EventCode: appContext.event?.eventCode,
      Route: window?.location?.pathname,
      InstallationId: await getId(getInstallations(getApp())),
    };

    hub?.invoke('UpdateInfo', info);
  };

  const onLogin = (token?: string) => {
    if (appContext === undefined) throw new Error('appContext was undefined');
    if (db === undefined) throw new Error('aaa db was undefined');

    setIsAuthenticated(true);

    onValue(ref(db, `/seasons/${appContext.season}/events/${token}`), (snap) => {
      setAppContext({
        ...appContext,
        event: snap.val() as Event,
        token,
      });

      sendCurrentStatus();
    });
  };

  // Login if a token is available
  useEffect(() => {
    if (appContext.token === undefined) return;
    onLogin(appContext.token);
  }, [appContext.token]);

  // Initialize app
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

    get(ref(newDb, '/current_season')).then((seasonData: DataSnapshot) => {
      if (!seasonData || !seasonData.exists) {
        throw new Error('Unable to get season...');
      }

      const season = Number.parseInt(seasonData.val(), 10);
      const token = Cookies.get('queueing-event-key');

      setAppContext({
        ...appContext,
        season,
        token,
      });
    });

    return () => { off(connRef); };
  }, []);

  /**
   * We're intentionally loading in SignalR totally separately. While it's important for visibility,
   * this loading slowly or failing to load should not cause any negative impacts on the app at all.
   * Plus, using SignalR allows me to remove Google Analytics entirely.
   */
  useEffect(() => {
    if (!process.env.PREACT_APP_SIGNALR_SERVER) return;
    import(/* webpackChunkName: "signalr" */ '@microsoft/signalr').then(async (signalR) => {
      const cn = new signalR.HubConnectionBuilder()
        .withUrl(`${process.env.PREACT_APP_SIGNALR_SERVER}/DisplayHub`).withAutomaticReconnect().build();
      setHub(cn);
      cn.on('SendRefresh', async () => {
        // Clear caches and reload
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach(async (name) => {
              await caches.delete(name);
            });
          });
        }
        window?.location?.reload();
      });
      cn.on('SendNewRoute', (route) => {
        // Navigate within the SPA
        navigateToRoute(route);
      });
      cn.on('Identify', () => {
        // Display the connection ID
        if (identifyTO !== null) clearTimeout(identifyTO);

        setIdentifyTO(setTimeout(() => {
          setIdentifyTO(null);
        }, 15000));
      });
      cn.on('OverrideEventKey', async (eventToken) => {
        try {
          // TODO: Show error if unable to determine season
          const event = await get(ref(getDatabase(), `/seasons/${appContext.season}/events/${eventToken}`));
          if (!event) {
            throw new Error('Unable to get event');
          }

          const end = new Date(event.child('end').val().replace(' ', 'T'));
          Cookies.set('queueing-event-key', eventToken, {
            expires: end,
          });
          onLogin(eventToken);
        } catch (err) {
          console.error(err);
        }
      });
      cn.onreconnected(() => {
        sendCurrentStatus();
      });
      await cn.start();
      setTimeout(() => {
        // This is really hacky, I'm not sure why I need to do this
        sendCurrentStatus();
      }, 2000);
    }).catch(((err) => console.error('Failed to load SignalR bundle', err)));
  }, []);

  useEffect(() => {
    sendCurrentStatus();
  }, [hub, appContext, appContext.event?.eventCode]);

  const onNewRoute = (route: RouterOnChangeArgs) => {
    if (hub?.state !== HubConnectionState.Connected) return;
    hub?.invoke('UpdateRoute', route.url);
  };

  // Change what's rendered based on global application state
  let appContent: JSX.Element;
  if (!appContext || (!isAuthenticated && connection?.connectionStatus === undefined)
      || (isAuthenticated && appContext.event === undefined)) {
    appContent = (<div className={styles.infoText}>Loading...</div>);
  } else if (isAuthenticated && appContext.event !== undefined) {
    appContent = (
      <Router onChange={onNewRoute}>
        <Route default component={ScreenChooser} />
        <Route component={QualQueueing} path="/qual/queueing" />
        <Route component={TeamRankings} path="/rankings" />
        <Route component={PlayoffBracket} path="/playoff/bracket" />
        <Route component={PlayoffQueueing} path="/playoff/queueing" />
      </Router>
    );
  } else {
    appContent = (<LoginForm onLogin={onLogin} />);
  }

  return (
    <div id="preact_root" className={styles.app}>
      {identifyTO !== null && <div className={styles.identify}>{hub?.connectionId}</div>}
      <AppContext.Provider value={appContext ?? {}}>
        { connection?.connectionStatus === 'offline' && (
          <div className={styles.warningBar}>
            Check network connection.
            {connection.lastConnectedDate
              && ` Last connected ${connection.lastConnectedDate?.toLocaleString([], { timeStyle: 'short' })}`}
          </div>
        ) }
        { appContent }
      </AppContext.Provider>
    </div>
  );
};

export default App;
