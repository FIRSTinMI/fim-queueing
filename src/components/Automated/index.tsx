import { h, Fragment, ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';

import AppContext from '@/AppContext';
import MenuBar from '../MenuBar';
import AppErrorMessage, { ErrorMessageType } from '../ErrorMessage';
import Link from '../Link';
import Routes from '@/routes';
import { useRealtimeEvent } from "@/hooks/supabase/useRealtimeEvent";
import Disclaimer from "@/components/shared/Disclaimer";

type AutomatedProps = {
  matches: {
    playoff?: string,
    qual?: string
  }
};

const Automated = (props: AutomatedProps) => {
  const { isPending, data } = useRealtimeEvent();
  const { matches: { playoff, qual } } = props;

  const ErrorMessage = ({ children, type }: {
    children: ComponentChildren,
    type?: ErrorMessageType,
  }) => (
    <>
      <MenuBar alwaysShow />
      <div>
        <AppErrorMessage type={type}>{ children }</AppErrorMessage>
      </div>
    </>
  );

  ErrorMessage.defaultProps = {
    type: 'info',
  };

  if (!playoff || !qual) {
    return (
      <ErrorMessage>
        You&apos;re missing some configuration info... Try going
        {' '}
        {' '}
        <Link href="/">home</Link>
        {' '}
        and giving it another shot.
      </ErrorMessage>
    );
  }
  
  if (isPending) {
    return (
      <Disclaimer>Loading...</Disclaimer>
    );
  }
  
  switch (data?.status) {
    case 'NotStarted':
    case 'AwaitingQuals':
    case 'QualsInProgress':
    {
      const routeToUse = Routes.find((r) => r.url === qual && r.usedIn.includes('qual'));
      if (!routeToUse) {
        return (
          <ErrorMessage>
            Double check your configuration, something isn&apos;t right here...
          </ErrorMessage>
        );
      }
      return (<routeToUse.component routeParams={routeToUse.params} />);
    }
    case 'AwaitingAlliances':
    case 'PlayoffsInProgress':
    case 'WinnerDetermined':
    {
      const routeToUse = Routes.find((r) => r.url === playoff && r.usedIn.includes('playoff'));
      if (!routeToUse) {
        return (
          <ErrorMessage>
            Double check your configuration, something isn&apos;t right here...
          </ErrorMessage>
        );
      }
      return (<routeToUse.component routeParams={routeToUse.params} />);
    }
    case 'Completed':
      return (
        <ErrorMessage type="arrow">
          The event has ended. See you next time!
        </ErrorMessage>
      );
    default:
      return (
        <ErrorMessage>
          Hmm... I&apos;m not sure what the event is up to right now...
        </ErrorMessage>
      );
  }
};

export default Automated;
