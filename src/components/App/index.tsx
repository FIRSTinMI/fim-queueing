import { h, Fragment } from 'preact';
import Cookies from 'js-cookie';
import { getApp, initializeApp } from 'firebase/app';
import {
  Database, DataSnapshot, get, getDatabase, off, onValue, ref,
} from 'firebase/database';
import { getId, getInstallations } from 'firebase/installations';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  Router, Route, RouterOnChangeArgs, route as navigateToRoute,
} from 'preact-router';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { ErrorBoundary } from 'react-error-boundary';

import { Event } from '@shared/DbTypes';
import Routes from '@/routes';
import styles from './styles.module.scss';
import LoginForm from '../LoginForm';
import ScreenChooser from '../ScreenChooser';
import AppContext, { AppContextType } from '../../AppContext';
import StaleDataBanner from '../StaleDataBanner';
import useStateWithRef from '@/useStateWithRef';
import ErrorMessage from '../ErrorMessage';
import AuthenticatedRoute from '../AuthenticatedRoute';
import { supabase } from "@/data/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRealtimeEvent } from "@/hooks/supabase/useRealtimeEvent";

// TODO: Figure out why the event details sometimes aren't getting sent over to SignalR

const queryClient = new QueryClient();

const ErrorFallback = ({ error }: { error: Error }) => {
  // Reload after a while to try a recovery
  useEffect(() => {
    const timeout = setTimeout(() => {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(async (name) => {
            await caches.delete(name);
          });
        });
      }
      window?.location?.reload();
    }, 30_000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!import.meta.env.APP_REPORT_ERROR_URL) return;
    async function reportError() {
      try {
        const formBody: string[] = [];
        Object.getOwnPropertyNames(error).forEach((key) => {
          const encodedKey = encodeURIComponent(key);
          const encodedValue = encodeURIComponent((error as any)[key]);
          formBody.push(`${encodedKey}=${encodedValue}`);
        });

        await fetch(import.meta.env.APP_REPORT_ERROR_URL!, {
          method: 'POST',
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody.join('&'),
          mode: 'no-cors',
        });
      } catch (_) {
        // Pass
      }
    }

    reportError();
  }, []);

  console.error(error);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ErrorMessage type="error">
        An unexpected error has occurred. Please use the
        {' '}
        <span style={{ whiteSpace: 'nowrap' }}>#av-help</span>
        {' '}
        FiM Slack channel for support.
      </ErrorMessage>
      <small style={{ fontSize: '.5em', display: 'block', paddingTop: '1em' }}>{error.message}</small>
    </div>
  );
};

const App = () => {
  const [db, setDb] = useState<Database>();
  const hub = useRef<HubConnection | undefined>(undefined);
  const [connection, setConnection] = useState<{
    connectionStatus?: 'online' | 'offline', lastConnectedDate?: Date
  }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const event = useRealtimeEvent();

  const [acFeatures, setFeatures] = useState<any>();
  const [acSeason, setSeason] = useState<number | undefined>();
  const [acEvent, setEvent] = useState<Event | undefined>();
  const [acToken, setToken] = useState<string | undefined>();
  const [appContext, setAppContext, appContextRef] = useStateWithRef<AppContextType>({});

  const [identifyTO, setIdentifyTO] = useState<ReturnType<typeof setTimeout> | null>(null);

  const sendCurrentStatus = async () => {
    if (hub.current?.state !== HubConnectionState.Connected) {
      console.log('Not connected to SignalR, not sending state');
      return;
    }

    console.log('Sending state to SignalR server', appContextRef.current);

    const info = {
      EventKey: appContextRef.current?.token,
      EventCode: appContextRef.current?.event?.eventCode,
      Route: window?.location?.pathname,
      InstallationId: await getId(getInstallations(getApp())),
    };

    hub.current?.invoke('UpdateInfo', info);
  };

  useEffect(() => {
    const newCtx = {
      features: acFeatures,
      //event: acEvent,
      season: acSeason,
      token: acToken,
    };
    //console.log('ac', newCtx)
    setAppContext(newCtx);
  }, [acFeatures, acEvent, acSeason, acToken]);

  useEffect(() => {
    sendCurrentStatus();
  }, [hub.current, appContext.token, appContext.event?.eventCode]);

  const onLogin = async (_: string, supaToken: string) => {
    if (appContext === undefined) throw new Error('appContext was undefined');
    if (db === undefined) throw new Error('db was undefined');

    setIsAuthenticated(true);
    await supabase.realtime.setAuth(supaToken);
    (supabase as any).rest.headers.Authorization = `Bearer ${supaToken}`;
    
    // onValue(ref(db, `/seasons/${appContext.season}/events/${token}`), (snap) => {
    //   setEvent(snap.val() as Event);
    //   setToken(token);
    // });
  };

  // Login if a token is available
  useEffect(() => {
    if (appContext.token === undefined || appContext.supaToken === undefined || !appContext.season) return;
    onLogin(appContext.token, appContext.supaToken);
  }, [appContext.token, appContext.supaToken, appContext.season]);

  // Initialize app
  useEffect(() => {
    console.log('Running initialization...');
    console.log(import.meta.env);
    const firebaseConfig = {
      apiKey: import.meta.env.APP_FIRE_KEY,
      databaseURL: import.meta.env.APP_RTDB_URL,
      projectId: import.meta.env.APP_FIRE_PROJ,
      appId: import.meta.env.APP_FIRE_APPID,
      authDomain: import.meta.env.APP_FIRE_AUTH_DOMAIN,
      measurementId: import.meta.env.APP_FIRE_MEASUREID,
    };

    const app = initializeApp(firebaseConfig);

    if (/:\/\/(localhost|127\.0\.0\.1)/.test(import.meta.env.APP_FIRE_AUTH_DOMAIN)) {
      const auth = getAuth(app);
      connectAuthEmulator(auth, import.meta.env.APP_FIRE_AUTH_DOMAIN, { disableWarnings: true });
    }

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
      let token = Cookies.get('queueing-event-key');
      if (!token) {
        const url = new URL(window.location.href);
        token = url.searchParams.get('key') ?? undefined;
      }

      setSeason(season);
      setToken(token);
    });

    return () => { off(connRef); };
  }, []);

  /**
   * We're intentionally loading in SignalR totally separately. While it's important for visibility,
   * this loading slowly or failing to load should not cause any negative impacts on the app at all.
   * Plus, using SignalR allows me to remove Google Analytics entirely.
   */
  useEffect(() => {
    if (!import.meta.env.APP_SIGNALR_SERVER) return;
    import(/* webpackChunkName: "signalr" */ '@microsoft/signalr').then(async (signalR) => {
      const cn = new signalR.HubConnectionBuilder()
        .withUrl(`${import.meta.env.APP_SIGNALR_SERVER}/DisplayHub`).withAutomaticReconnect({
          nextRetryDelayInMilliseconds(retryContext) {
            if (retryContext.previousRetryCount > 10) {
              return null;
            }

            return 2_000 * retryContext.previousRetryCount;
          },
        }).build();
      hub.current = cn;
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
        if (route[0] === '/') {
          navigateToRoute(`${route}${window?.location?.hash ?? ''}`);
        } else {
          window.location = route;
        }
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
          // TODO: Reimplement with supabase
          // // TODO: Show error if unable to determine season
          // const event = await get(ref(getDatabase(), `/seasons/${appContext.season}/events/${eventToken}`));
          // if (!event) {
          //   throw new Error('Unable to get event');
          // }
          //
          // const end = new Date(event.child('end').val().replace(' ', 'T'));
          // Cookies.set('queueing-event-key', eventToken, {
          //   expires: end,
          // });
          // onLogin(eventToken);
        } catch (err) {
          console.error(err);
        }
      });
      cn.onreconnected(() => {
        sendCurrentStatus();
      });
      await cn.start();
      sendCurrentStatus();
      // setTimeout(() => {
      //   // This is really hacky, I'm not sure why I need to do this
      //   sendCurrentStatus();
      // }, 2000);
    }).catch(((err) => console.error('Failed to load SignalR bundle', err)));
  }, []);

  useEffect(() => {
    if (!db) {
      return () => { };
    }
    const featuresRef = ref(db!, '/features');
    onValue(featuresRef, (snap: DataSnapshot) => {
      if (!snap || !snap.exists()) {
        console.error('Unable to get features');
      }

      setFeatures(snap.val());
    });

    return () => off(featuresRef);
  }, [db]);

  const onNewRoute = (route: RouterOnChangeArgs) => {
    if (hub.current?.state !== HubConnectionState.Connected) return;
    hub.current?.invoke('UpdateRoute', route.url);
  };

  const skipEventKey = Routes
    .map((rt) => rt.skipEventKey && rt.url)
    .includes(window.location.pathname);

  // Change what's rendered based on global application state
  let appContent: JSX.Element;
  if (!appContext || (!isAuthenticated && connection?.connectionStatus === undefined)) {
    appContent = (<div className={styles.infoText}>Loading...</div>);
  } else if ((isAuthenticated) || skipEventKey) {
    appContent = (
      <>
        <StaleDataBanner />
        <Router onChange={onNewRoute}>
          {/* NOTE: Do not add new routes here. Add them in `src/routes.ts` */}
          <Route default component={ScreenChooser} />
          {Routes.map((rt) => {
            const Cmp = rt.requiresLogin === true ? AuthenticatedRoute : Route;
            return (
              <Cmp component={rt.component as any} path={rt.url} routeParams={rt.params} />
            );
          })}
        </Router>
      </>
    );
  } else {
    appContent = (<LoginForm onLogin={onLogin} />);
  }

  return (
    <div id="preact_root" className={styles.app}>
      {identifyTO !== null && <div className={styles.identify}>{hub.current?.connectionId}</div>}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <AppContext.Provider value={appContext ?? {}}>
            {connection?.connectionStatus === 'offline' && (
              <div className={styles.warningBar}>
                Check network connection.
                {connection.lastConnectedDate
                  && ` Last connected ${connection.lastConnectedDate?.toLocaleString([], { timeStyle: 'short' })}`}
              </div>
            )}
            {appContent}
          </AppContext.Provider>
          {import.meta.env.DEV && <div style={{fontSize: '16px'}}><ReactQueryDevtools/></div>}
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  );
};

export default App;
