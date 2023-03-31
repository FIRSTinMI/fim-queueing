/**
 * @file Defines all routes in the application and their metadata
 */

import { FunctionalComponent } from 'preact';
import Automated from './components/Automated';
import Embeddable, { EmbeddableRouteParams } from './components/Embeddable';
import PlayoffBracket from './components/PlayoffBracket';
import PlayoffQueueing from './components/PlayoffQueueing/Queueing';
import Queueing from './components/QualDisplay/Queueing';
import KeyableTicker from './components/RankingDisplay/KeyableTicker';
import TeamRankings from './components/RankingDisplay/TeamRankings';

type Route<TParams> = {
  name: string,
  url: string,
  component: FunctionalComponent<any>,
  usedIn: ('qual' | 'playoff')[]
  params?: TParams,
  hideFromNav?: boolean,
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
    name: 'Playoff Bracket',
    url: '/playoff/bracket',
    component: PlayoffBracket,
    usedIn: ['playoff'],
  },
  {
    name: 'Rankings Ticker (Audience Display)',
    url: '/ranking/ticker',
    component: KeyableTicker,
    usedIn: [],
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
      iframeUrl: (_, evt) => evt.streamEmbedLink,
    },
  } as Route<EmbeddableRouteParams>,
  {
    name: 'Automated',
    url: '/automated',
    component: Automated,
    usedIn: [],
    hideFromNav: true,
  },
];

export default Routes;
