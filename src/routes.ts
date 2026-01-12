/**
 * @file Defines all routes in the application and their metadata
 */

import { FunctionalComponent } from 'preact';
import Automated from './components/Automated';
import Embeddable, { EmbeddableRouteParams } from './components/Embeddable';
import PlayoffBracket from './components/PlayoffBracket';
import PlayoffQueueing from './components/PlayoffQueueing/Queueing';
import Queueing from './components/QualDisplay/Queueing';
import TeamRankings from './components/RankingDisplay/TeamRankings';
import UserLogin from './components/Manage/UserLogin';
import Options from './components/Manage/Options';
import Overlay from './Overlay';
import { AppContextType } from './AppContext';
import MultiQueueing from './components/MultiDisplay';

type Route<TParams> = {
  name: string,
  url: string,
  linkFactory?: (ctx: AppContextType) => string,
  component: FunctionalComponent<any>,
  usedIn: ('qual' | 'playoff')[]
  params?: TParams,
  hideFromNav?: boolean,
  requiresLogin?: boolean,
  skipEventKey?: boolean,
};

const Routes: Route<any>[] = [
  {
    name: 'Qualification Queueing',
    url: '/qual/queueing',
    component: Queueing,
    usedIn: ['qual'],
  },
  {
    name: 'Team Rankings',
    url: '/qual/rankings',
    component: TeamRankings,
    usedIn: ['qual'],
  },
  {
    name: 'Playoff Queueing',
    url: '/playoff/queueing',
    component: PlayoffQueueing,
    usedIn: ['playoff'],
  },
  {
    name: 'Multi-Event Queueing',
    url: '/multi/queueing',
    component: MultiQueueing,
    hideFromNav: true,
    requiresLogin: false,
    skipEventKey: true,
    usedIn: [],
  },
  {
    name: 'Playoff Bracket',
    url: '/playoff/bracket',
    component: PlayoffBracket,
    usedIn: ['playoff'],
  },
  {
    name: 'FRC Pit Display',
    url: '/frcpitdisplay',
    component: Embeddable,
    usedIn: ['qual', 'playoff'],
    params: {
      iframeUrl: (season, evt) => `https://frc-events.firstinspires.org/${season}/${evt.eventCode}/rankings/live`,
    },
  } as Route<EmbeddableRouteParams>,
  {
    name: 'Live Stream',
    url: '/stream',
    component: Embeddable,
    usedIn: ['qual', 'playoff'],
    params: {
      iframeUrl: (_, evt) => evt.streamEmbedLink?.replace('%HOST%', window?.location?.hostname),
    },
  } as Route<EmbeddableRouteParams>,
  {
    name: 'Nexus for FRC',
    url: '/nexus',
    component: Embeddable,
    usedIn: ['qual', 'playoff'],
    params: {
      iframeUrl: (season, evt) => `https://frc.nexus/en/event/${
        /^\d/.test(evt.eventCode)
          ? evt.eventCode.toLowerCase()
          : `${season}${evt.eventCode.toLowerCase()}`
      }/display/pit`,
    },
  } as Route<EmbeddableRouteParams>,
  {
    name: 'Automated',
    url: '/automated',
    component: Automated,
    usedIn: [],
    hideFromNav: true,
  },
  {
    name: 'Login',
    url: '/login',
    component: UserLogin,
    usedIn: [],
    hideFromNav: true,
  },
  {
    name: 'Manage Options',
    url: '/manage/options',
    component: Options,
    usedIn: [],
    requiresLogin: true,
  },
  {
    name: 'Stream Overlay',
    url: '/overlay',
    linkFactory: (ctx: AppContextType) => `/overlay?key=${ctx.token}`,
    component: Overlay,
    usedIn: [],
  },
];

export default Routes;
