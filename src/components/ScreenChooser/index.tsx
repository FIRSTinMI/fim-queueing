import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import Link from '@/components/Link';
import AppContext from '@/AppContext';
import MenuBar from '../MenuBar';
import styles from './styles.scss';

let previousSetupState: { qual: string, playoff: string } | undefined;

export default function ScreenChooser() {
  const ctx = useContext(AppContext);
  const { event, season, features } = ctx;
  const [qualScreen, setQualScreen] = useState<string>('/qual/queueing');
  const [playoffScreen, setPlayoffScreen] = useState<string>('/playoff/queueing');

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
            <option value="/qual/queueing">Queueing</option>
            <option value="/rankings">Rankings</option>
            <option value="/stream">Stream</option>
          </select>
        </label>
        <label htmlFor="playoffSelect">
          Playoffs
          <select
            id="playoffSelect"
            value={playoffScreen}
            onChange={(e: any) => setPlayoffScreen(e.target.value)}
          >
            <option value="/playoff/queueing">Queueing</option>
            <option value="/playoff/bracket">Bracket</option>
            <option value="/stream">Stream</option>
          </select>
        </label>
        <button type="submit">Start</button>
      </form>
      <hr />
      <h4>Or, Select Directly</h4>
      <ul>
        <li><Link href="/qual/queueing">Qualification Queueing</Link></li>
        {features?.showRankingsScreen === true && <li><Link href="/rankings">Rankings</Link></li>}
        <li><Link href="/playoff/bracket">Playoff Bracket</Link></li>
        <li><Link href="/playoff/queueing">Playoff Queueing</Link></li>
        <li><Link href="/stream">Live Stream</Link></li>
      </ul>
    </div>
  );
}
