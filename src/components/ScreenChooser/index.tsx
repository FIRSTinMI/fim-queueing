import { h } from 'preact';
import { Link } from 'preact-router';
import { useContext } from 'preact/hooks';
import AppContext from '../../AppContext';
import MenuBar from '../MenuBar';
import styles from './styles.scss';

export default function ScreenChooser() {
  const { event, season } = useContext(AppContext);
  return (
    <div className={styles.screenChooser}>
      <MenuBar event={event} season={season} alwaysShow />
      <ul>
        <li><Link href="/qual/queueing">Qualification Queueing</Link></li>
        <li><Link href="/rankings">Rankings</Link></li>
        <li><Link href="/playoff/bracket">Playoff Bracket</Link></li>
        <li><Link href="/playoff/queueing">Playoff Queueing</Link></li>
      </ul>
    </div>
  );
}
