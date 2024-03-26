import { h } from 'preact';
import {
  useEffect
} from 'preact/hooks';
import EventRow from './EventRow';

const MultiQueueing = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const events = searchParams.getAll('e');
  const season = searchParams.get('s') ?? new Date().getFullYear().toString();


  return (
    <div>
      {
        events.map((event) => <EventRow token={event} season={season} key={event} />)
      }
    </div>
  )
};

export default MultiQueueing;
