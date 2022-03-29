export type AppMode = 'automatic' | 'assisted';

export type Event = {
  start: Date;
  end: Date;
  name: string;
  eventCode: string;
  currentMatchNumber: number | null;
  hasQualSchedule: boolean;
  mode: AppMode;
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
