import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import Link from '@/components/Link';
import AppContext from '@/AppContext';
import MenuBar from '../MenuBar';
import styles from './styles.module.scss';
import Routes from '@/routes';
import { useRealtimeEvent } from "@/hooks/supabase/useRealtimeEvent";

let previousSetupState: { qual: string, playoff: string } | undefined;

export default function ScreenChooser() {
  const ctx = useContext(AppContext);
  const { event, season } = ctx;
  const [qualScreen, setQualScreen] = useState<string>('/qual/queueing');
  const [playoffScreen, setPlayoffScreen] = useState<string>('/playoff/queueing');
  const supaEvent = useRealtimeEvent();

  function buildSetupQueryString() {
    const parts = [];
    if (qualScreen) parts.push(`qual=${qualScreen}`);
    if (playoffScreen) parts.push(`playoff=${playoffScreen}`);
    let loc = window.location.pathname + window.location.search;
    if (parts.length > 0) {
      loc += `?${parts.join('&')}`;
    }
    previousSetupState = { qual: qualScreen, playoff: playoffScreen };
    return loc;
  }

  function onSetupSubmit(e: Event): void {
    e.preventDefault();
    route(`/automated${buildSetupQueryString()}`);
  }

  useEffect(() => {
    if (previousSetupState) {
      setQualScreen(previousSetupState.qual);
      setPlayoffScreen(previousSetupState.playoff);
    }
  }, []);

  return (
    <div className={styles.screenChooser}>
      <MenuBar event={event} season={season} alwaysShow />
      <h4>Set Up Display</h4>
      <p>
        Choose what the display should look like, click &quot;Start&quot;, and the display
        will automatically switch between your selections as the event progresses.
      </p>
      <form className={styles.setup} onSubmit={onSetupSubmit}>
        <label htmlFor="qualSelect">
          Qualifications
          <select
            id="qualSelect"
            value={qualScreen}
            onChange={(e: any) => setQualScreen(e.target.value)}
          >
            {Routes.filter((r) => r.usedIn.includes('qual')).map((r) => (
              <option value={r.url}>{r.name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="playoffSelect">
          Playoffs
          <select
            id="playoffSelect"
            value={playoffScreen}
            onChange={(e: any) => setPlayoffScreen(e.target.value)}
          >
            {Routes.filter((r) => r.usedIn.includes('playoff')).map((r) => (
              <option value={r.url}>{r.name}</option>
            ))}
          </select>
        </label>
        <button type="submit">Start</button>
      </form>
      <hr />
      <h4>Or, Select Directly</h4>
      <ul>
        {Routes.filter((r) => r.hideFromNav !== true).map((r) => (
          <li>
            <Link href={r.linkFactory === undefined ? r.url : r.linkFactory(ctx)}>{r.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
