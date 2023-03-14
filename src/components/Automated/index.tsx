import { h, Fragment, ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';

import AppContext from '@/AppContext';
import MenuBar from '../MenuBar';
import Link from '../Link';
import QualQueueing from '../QualDisplay/Queueing';
import PlayoffQueueing from '../PlayoffQueueing/Queueing';
import PlayoffBracket from '../PlayoffBracket';
import LiveStream from '../LiveStream';
import TeamRankings from '../RankingDisplay/TeamRankings';

type AutomatedProps = {
  matches: {
    playoff?: string,
    qual?: string
  }
};

const Automated = (props: AutomatedProps) => {
  const { event, season } = useContext(AppContext);
  const { matches: { playoff, qual } } = props;

  const Error = ({ children }: { children: ComponentChildren }) => (
    <>
      <MenuBar event={event} season={season} alwaysShow />
      <div style={{
        margin: '1em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
      >
        <p>{ children }</p>
      </div>
    </>
  );

  if (!playoff || !qual) {
    return (
      <Error>
        You&apos;re missing some configuration info... Try going {' '}
        <Link href="/">home</Link> and giving it another shot.
      </Error>
    );
  }
  switch (event?.state) {
    case 'Pending':
    case 'AwaitingQualSchedule':
    case 'QualsInProgress':
      switch (qual) {
        case '/qual/queueing': return <QualQueueing />;
        case '/rankings': return <TeamRankings />;
        case '/stream': return <LiveStream />;
        default:
          return (
            <Error>
              Double check your configuration, something isn&apos;t right here...
            </Error>
          );
      }
    case 'AwaitingAlliances':
    case 'PlayoffsInProgress':
      switch (playoff) {
        case '/playoff/queueing': return <PlayoffQueueing />;
        case '/playoff/bracket': return <PlayoffBracket />;
        case '/stream': return <LiveStream />;
        default:
          return (
            <Error>
              Double check your configuration, something isn&apos;t right here...
            </Error>
          );
      }
    case 'EventOver':
      return (
        <Error>
          The event has ended. See you next time!
        </Error>
      );
    default:
      return (
        <Error>
          Hmm... I&apos;m not sure what the event is up to right now...
        </Error>
      );
  }
};

export default Automated;
