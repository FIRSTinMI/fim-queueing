import { QualMatch } from '@shared/DbTypes';
import { PlayoffMatchDisplay } from '@/components/PlayoffQueueing/PlayoffMatchDisplay';

// TODO: this should be moved to DbTypes once the type is available
export type Break = {
  after: number;
  level: 'qual';
  message: string;
};

export type MatchOrBreak = QualMatch | Break | null;

// Qual Match Data
export type QualMatchData = {
  currentMatch: MatchOrBreak | null;
  nextMatch: MatchOrBreak | null;
  queueingMatches: MatchOrBreak[];
};

// Playoff Match Data
export type PlayoffMatchData = {
  currentMatch: PlayoffMatchDisplay | null;
  nextMatch: PlayoffMatchDisplay | null;
  queueingMatches: PlayoffMatchDisplay[];
};
