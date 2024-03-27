import { BracketMatchNumber } from './DoubleEliminationBracketMapping';

export type EventState = 'Pending' | 'AwaitingQualSchedule' | 'QualsInProgress'
| 'AwaitingAlliances' | 'PlayoffsInProgress' | 'EventOver';

export type AppMode = 'automatic' | 'assisted';

export type Event = {
  // TODO: temporary
  dataSource?: string,
  start: string,
  end: string,
  name: string,
  eventCode: string,
  currentMatchNumber: number | null,
  playoffMatchNumber: BracketMatchNumber | null
  streamEmbedLink?: string;
  numQualMatches: number | null,
  mode: AppMode,
  state: EventState,
  /**
   * The timestamp of the most recent data we have from the FRC API, in ms since
   * the Unix epoch. This number will only ever stay the same or get bigger
   */
  lastModifiedMs: number | null,
  options: {
    showRankings: boolean,
    showEventName: boolean,
    maxQueueingToShow?: number,
  },
  sponsorLogoUrl?: string,
};

export type DriverStation = 'Red1' | 'Red2' | 'Red3' | 'Blue1' | 'Blue2'
| 'Blue3';

export type PlayoffMatch = {
  winner: 'red' | 'blue' | null,
  participants: Record<DriverStation, number>,
  redAlliance: number | null,
  blueAlliance: number | null
};

export type QualMatch = {
  number: number,
  participants: Record<DriverStation, number>,
};

export type TeamRanking = {
  rank: number;
  teamNumber: number;
  rankingPoints: number;
  wins: number;
  ties: number;
  losses: number;
  sortOrder2: number;
  sortOrder3: number;
  sortOrder4: number;
};

export type Alliance = {
  number: number;
  teams: number[];
  shortName: string;
};
