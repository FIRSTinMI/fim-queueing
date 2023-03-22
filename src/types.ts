// TODO: Move any relevant portions of this file to `shared`

import { FunctionalComponent } from 'preact';

export type RouteComponent<TParams = {}, TRouteParams = undefined> =
  FunctionalComponent<TParams & TRouteParams>;

export type AppMode = 'automatic' | 'assisted';

export type Event = {
  start: Date;
  end: Date;
  name: string;
  eventCode: string;
  currentMatchNumber: number | null;
  hasQualSchedule: boolean;
  streamEmbedLink?: string;
  lastModifiedMs: number | null;
  mode: AppMode;
  options?: {
    showRankings?: boolean;
    showEventName?: boolean;
  }
};

export type Match = {
  description: string;
  level: string | null;
  startTime: Date;
  matchNumber: number;
  field: string;
  tournamentLevel: string;
  teams: Team[];
};

export type Team = {
  teamNumber: number;
  station: 'Red1' | 'Red2' | 'Red3' | 'Blue1' | 'Blue2' | 'Blue3';
  surrogate: boolean;
};

export type TeamAvatars = {
  [id: number]: string;
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
  number: number,
  captain: number,
  round1: number,
  round2: number,
  round3?: number,
  backup?: number,
  backupReplaced: number,
  name: string
};

export type TournamentLevel = 'qf' | 'sf' | 'f';
export type PlayoffMatchup = {
  name: string
  number: number,
  redAlliance: number | null,
  blueAlliance: number | null,
  wins: { red: number, blue: number },
};
export type Bracket = {
  [level in TournamentLevel]: PlayoffMatchup[]
};
