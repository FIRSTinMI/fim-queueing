import { h } from 'preact';
import { Link } from 'preact-router';
import { Event } from '../../types';
import MenuBar from '../MenuBar';

type ScreenChooserProps = {
  event: Event,
  season: number
};

export default function ScreenChooser(props: ScreenChooserProps) {
  const { event, season } = props;
  return (
    <div>
      <MenuBar event={event} season={season} alwaysShow />
      <ul>
        <li><Link href="/qual/queueing">Qualification Queueing</Link></li>
        <li><Link href="/rankings">Rankings</Link></li>
      </ul>
    </div>
  );
}
