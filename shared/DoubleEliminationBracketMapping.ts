/**
 * @file Provides information to both the client and server for calculating
 * and rendering a double elimination FRC bracket. Based on FRC Game Manual
 * fetched late January 2023.
 */

/** Alliance is determined by an alliance number */
export type AllianceSource = { allianceNumber: number };
/** Alliance is determined by who won a previous match */
export type WinnerSource = { winnerFrom: number };
/** Alliance is determined by who lost a previous match */
export type LoserSource = { loserFrom: number };

/**
 * A type which covers all possible ways an alliance is determined.
 * The presence of `allianceNumber`, `winnerFrom` or `loserFrom` (mutually
 * exclusive) determines the type of source.
 * @see {@link AllianceSource}
 * @see {@link WinnerSource}
 * @see {@link LoserSource}
 */
export type ParticipantSource = AllianceSource | WinnerSource | LoserSource;

export type BracketRound = {
  /** The name of the round */
  name: string,
  /** The relative `x` coordinate of the round. Unitless. */
  x: number,
};

export type BracketMatchNumber = number | 'F';

export type BracketMatch = {
  number: BracketMatchNumber,

  /** Optionally override the match numbers pulled from the FRC API */
  overrideMatchNumbers?: number[],

  /**
   * Which round the matchup is in. Must match the name of a round
   * @see {@link BracketRound.name}
   */
  round: string,

  /** The relative `y` coordinate of the matchup. Unitless. */
  y: number,

  /** The number of wins required to be considered the winner of the matchup */
  winsRequired: number,

  participants: {
    red: ParticipantSource,
    blue: ParticipantSource
  }
};

export type BracketMapping = {
  /** Each round in a double elimination bracket */
  rounds: BracketRound[],

  /**
   * Each matchup, with best-of-3 matches grouped together (see
   * overrideMatchNumbers)
   */
  matches: BracketMatch[],

  /** Which matches end with a field timeout */
  breakAfter: BracketMatchNumber[],
};

const DoubleEliminationBracketMapping: BracketMapping = {
  rounds: [
    { name: 'Round 1', x: 0 },
    { name: 'Round 2', x: 250 },
    { name: 'Round 3', x: 500 },
    { name: 'Round 4', x: 750 },
    { name: 'Round 5', x: 1000 },
    { name: 'Finals', x: 1250 },
  ],
  matches: [
    // Upper bracket, round 1
    {
      number: 1,
      round: 'Round 1',
      y: 0,
      winsRequired: 1,
      participants: {
        red: { allianceNumber: 1 },
        blue: { allianceNumber: 8 },
      },
    },
    {
      number: 2,
      round: 'Round 1',
      y: 90,
      winsRequired: 1,
      participants: {
        red: { allianceNumber: 4 },
        blue: { allianceNumber: 5 },
      },
    },
    {
      number: 3,
      round: 'Round 1',
      y: 180,
      winsRequired: 1,
      participants: {
        red: { allianceNumber: 2 },
        blue: { allianceNumber: 7 },
      },
    },
    {
      number: 4,
      round: 'Round 1',
      y: 270,
      winsRequired: 1,
      participants: {
        red: { allianceNumber: 3 },
        blue: { allianceNumber: 6 },
      },
    },
    // Lower bracket, round 2
    {
      number: 5,
      round: 'Round 2',
      y: 400,
      winsRequired: 1,
      participants: {
        red: { loserFrom: 1 },
        blue: { loserFrom: 2 },
      },
    },
    {
      number: 6,
      round: 'Round 2',
      y: 490,
      winsRequired: 1,
      participants: {
        red: { loserFrom: 3 },
        blue: { loserFrom: 4 },
      },
    },
    // Upper bracket, round 2
    {
      number: 7,
      round: 'Round 2',
      y: 45,
      winsRequired: 1,
      participants: {
        red: { winnerFrom: 1 },
        blue: { winnerFrom: 2 },
      },
    },
    {
      number: 8,
      round: 'Round 2',
      y: 225,
      winsRequired: 1,
      participants: {
        red: { winnerFrom: 3 },
        blue: { winnerFrom: 4 },
      },
    },
    // Lower bracket, round 3
    {
      number: 9,
      round: 'Round 3',
      y: 490,
      winsRequired: 1,
      participants: {
        red: { loserFrom: 7 },
        blue: { winnerFrom: 6 },
      },
    },
    {
      number: 10,
      round: 'Round 3',
      y: 400,
      winsRequired: 1,
      participants: {
        red: { loserFrom: 8 },
        blue: { winnerFrom: 5 },
      },
    },
    // Lower bracket, round 4
    {
      number: 11,
      round: 'Round 4',
      y: 135,
      winsRequired: 1,
      participants: {
        red: { winnerFrom: 7 },
        blue: { winnerFrom: 8 },
      },
    },
    // Upper bracket, round 4
    {
      number: 12,
      round: 'Round 4',
      y: 445,
      winsRequired: 1,
      participants: {
        red: { winnerFrom: 10 },
        blue: { winnerFrom: 9 },
      },
    },
    // Lower bracket, round 5
    {
      number: 13,
      round: 'Round 5',
      y: 445,
      winsRequired: 1,
      participants: {
        red: { loserFrom: 11 },
        blue: { winnerFrom: 12 },
      },
    },
    // Final
    {
      number: 'F',
      overrideMatchNumbers: [14, 15, 16],
      round: 'Finals',
      y: 200,
      winsRequired: 2,
      participants: {
        red: { winnerFrom: 11 },
        blue: { winnerFrom: 13 },
      },
    },
  ],
  breakAfter: [10, 12, 13],
};

export default DoubleEliminationBracketMapping;
