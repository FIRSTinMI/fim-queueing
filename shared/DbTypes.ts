export type EventState = 'Pending' | 'AwaitingQualSchedule' | 'QualsInProgress'
| 'AwaitingAlliances' | 'PlayoffsInProgress' | 'EventOver';

export type AppMode = 'automatic' | 'assisted';

export type Event = {
  start: string,
  end: string,
  name: string,
  eventCode: string,
  currentMatchNumber: number | null,
  mode: AppMode,
  state: EventState,
  options: {
    showRankings: boolean
  }
};

export type DriverStation = 'Red1' | 'Red2' | 'Red3' | 'Blue1' | 'Blue2'
| 'Blue3';

export type PlayoffMatch = {
  winner: 'red' | 'blue' | null,
  participants: Record<DriverStation, number>,
  redAlliance: number | null,
  blueAlliance: number | null
};
