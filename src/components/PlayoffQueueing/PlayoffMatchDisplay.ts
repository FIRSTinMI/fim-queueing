import { PlayoffMatch } from '@shared/DbTypes';
import { BracketMatch, BracketMatchNumber } from '@shared/DoubleEliminationBracketMapping';

export type PlayoffMatchDisplay = {
  result: PlayoffMatch | null,
  match: BracketMatch | null,
  num: BracketMatchNumber | null,
  customDisplayText?: string,
};
