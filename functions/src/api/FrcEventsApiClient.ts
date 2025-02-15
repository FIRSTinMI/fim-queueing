import {
  Alliance, DriverStation, QualMatch, TeamRanking,
} from '../../../shared/DbTypes';
import DoubleEliminationBracketMapping, { BracketMatchNumber } from '../../../shared/DoubleEliminationBracketMapping';
import GenericApiClient, { PlayoffMatchInfo } from './GenericApiClient';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

export default class FrcEventsApiClient extends GenericApiClient {
  protected apiClientName: string = 'frcEvents';

  constructor(apiKey: string, baseUrl: string = 'https://frc-api.firstinspires.org/v3.0') {
    if (!apiKey) {
      throw new Error('API key is required to initialize FRC Events API Client');
    }
    super({ Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` }, baseUrl);
  }

  /** @inheritdoc */
  public async getCurrentQualMatch(eventCode: string, season: number,
    lastKnown: number | undefined = undefined): Promise<number | null> {
    const resp = await this.get<ApiMatchResults>(
      `/${season}/matches/${eventCode}?tournamentLevel=qual&start=${lastKnown ?? 1}`,
      eventCode,
    );

    const latestMatch = resp.Matches
      .filter((x) => x.actualStartTime != null)
      .sort((x) => -1 * x.matchNumber)[0];

    if (!latestMatch) return null;

    return latestMatch.matchNumber + 1;
  }

  /** @inheritdoc */
  public async getQualSchedule(eventCode: string, season: number): Promise<QualMatch[]> {
    const resp = await this.get<ApiSchedule>(`/${season}/schedule/${eventCode}?tournamentLevel=qual`, eventCode);

    return resp.Schedule.map((x) => ({
      number: x.matchNumber,
      schedStart: new Date(x.startTime), // This is local time!
      participants: x.teams.filter((team) => !!team.teamNumber)
        .reduce((prev, team) => ({
          ...prev,
          [team.station]: team.teamNumber,
        }), {} as Record<DriverStation, number>),
    }));
  }

  /** @inheritdoc */
  public async getPlayoffBracket(eventCode: string, season: number, eventKey: string)
    : Promise<Partial<Record<BracketMatchNumber, PlayoffMatchInfo[]>>> {
    const playoffMatches = await this.get<ApiMatchResults>(`/${season}/matches/${eventCode}?tournamentLevel=playoff`, eventCode);
    let scoreDetails: any;
    /**
     * Find the winner for a particulat match in the schedule. Factor in tiebreak
     * rules if applicable
     * @param {ApiMatch} match Match results from the FRC API
     * @param {BracketMatchNumber} bracketMatchNumber The match number in the
     * bracket
     * @return {Promise<"red" | "blue" | null>} The winner, or null if no winner
     */
    const getWinnerFromMatch = async (match: ApiMatchResult,
      bracketMatchNumber: BracketMatchNumber): Promise<'red' | 'blue' | null> => {
      if (match.scoreRedFinal === null || match.scoreBlueFinal === null) {
        return null;
      }
      if (match.scoreRedFinal > match.scoreBlueFinal) return 'red';
      if (match.scoreBlueFinal > match.scoreRedFinal) return 'blue';

      if (bracketMatchNumber === 'F') {
        // Finals don't have any tiebreak rules, they just get sent to overtime.
        // Right now we're not handling overtime matches. I'm okay with just not
        // declaring a winner of the tournament in this system.
        return null;
      }

      // We have a tie, let's make sure we haven't already calculated a winner
      // See Game manual chapter 11.7.2.1 for tie rules
      const winner = (await admin.database()
        .ref(`/seasons/${season}/bracket/${eventKey}/${bracketMatchNumber}`
          + '/winner')
        .get()).val();
      if (winner !== null && winner !== undefined) return winner;

      // The score details endpoint is season-specific
      if (season !== 2025) {
        throw new Error('Unable to handle game-specific tiebreak rules for '
            + 'other seasons');
      }

      functions.logger.info('Need to fetch score details for match',
        bracketMatchNumber);
      if (scoreDetails === undefined) {
        scoreDetails = (await this.get<any>(`/${season}/scores/${eventCode}/playoff`,
          eventCode)).MatchScores;
      }

      const matchDetails = scoreDetails.find((x: any) => x.matchNumber === match.matchNumber);
      if (!matchDetails) return null;
      const red = matchDetails.alliances
        .find((x: any) => x.alliance === 'Red');
      const blue = matchDetails.alliances
        .find((x: any) => x.alliance === 'Blue');

      //
      // Begin season specific logic
      //

      if (red.techFoulCount === undefined || blue.techFoulCount === undefined
        || red.endGameBargePoints === undefined
        || blue.endGameBargePoints === undefined
        || red.autoPoints === undefined || blue.autoPoints === undefined
      ) return null;

      // 1. Alliance with the most tech foul points wins
      if (red.techFoulCount > blue.techFoulCount) return 'blue';
      if (blue.techFoulCount > red.techFoulCount) return 'red';

      // 2. Alliance with the most auto points wins
      if (red.autoPoints > blue.autoPoints) return 'red';
      if (blue.autoPoints > red.autoPoints) return 'blue';

      // 3. Alliance with the most barge points wins
      if (red.endGameBargePoints
          > blue.endGameBargePoints) return 'red';
      if (blue.endGameBargePoints
            > red.endGameBargePoints) return 'blue';

      //
      // End season specific logic
      //

      return null;
    };

    const bracket: Partial<Record<BracketMatchNumber, PlayoffMatchInfo[]>> = {};
    // Assuming 8 alliance double elimination
    await Promise.all(DoubleEliminationBracketMapping.matches.map(async (bm) => {
      const matchResults = playoffMatches.Matches.filter((m) => (
        bm.overrideMatchNumbers
          ? bm.overrideMatchNumbers.includes(m.matchNumber)
          : bm.number === m.matchNumber));

      if (matchResults.length) {
        bracket[bm.number] = await Promise.all(matchResults.map(async (mr) => ({
          participants: mr.teams.filter((team) => !!team.teamNumber && team.teamNumber > 3)
            .reduce((prev, team) => ({
              ...prev,
              [team.station]: team.teamNumber,
            }), {} as Record<DriverStation, number>),
          winner: await getWinnerFromMatch(mr, bm.number),
        })));
      }
    }));
    return bracket;
  }

  /** @inheritdoc */
  public async getRankings(eventCode: string, season: number): Promise<TeamRanking[]> {
    const rankingJson = await this.get<ApiRankings>(`/${season}/rankings/${eventCode}`, eventCode);

    if ((rankingJson.Rankings?.length ?? 0) > 0) {
      return rankingJson.Rankings.map((x) => ({
        rank: x.rank,
        teamNumber: x.teamNumber,
        wins: x.wins,
        ties: x.ties,
        losses: x.losses,
        rankingPoints: x.sortOrder1,
        sortOrder2: x.sortOrder2,
        sortOrder3: x.sortOrder3,
        sortOrder4: x.sortOrder4,
        sortOrder5: x.sortOrder5,
      }));
    }

    // Meh...
    return [];
  }

  /** @inheritdoc */
  public async getAlliances(eventCode: string, season: number): Promise<Alliance[] | null> {
    let alliances: ApiAlliances | undefined;
    try {
      alliances = await this.get<ApiAlliances>(`/${season}/alliances/${eventCode}`, eventCode) as ApiAlliances;
    } catch (e) {
      // The FRC API seems to just error out sometimes fetching alliances...
      functions.logger.warn(`Error while fetching alliances for event ${eventCode}`, e);
    }

    if (!alliances || !alliances.Alliances?.length || !alliances.Alliances[0].captain) {
      return null;
    }
    return alliances.Alliances.map((a) => ({
      number: a.number,
      shortName: a.name.replace('Alliance', '').trim(),
      teams: [a.captain, a.round1, a.round2, a.round3, a.backup].filter((t) => !!t) as number[],
    }));
  }
}

type ApiSchedule = {
  'Schedule': {
    'field': string;
    'tournamentLevel': string;
    'description': string;
    'startTime': string;
    'matchNumber': number;
    'teams': {
      'teamNumber': number;
      'station': string;
      'surrogate': boolean;
    }[]
  }[]
};

type ApiMatchResult = {
  'actualStartTime': string;
  'tournamentLevel': string;
  'postResultTime': string;
  'description': string;
  'matchNumber': number;
  'scoreRedFinal': number;
  'scoreRedFoul': number;
  'scoreRedAuto': number;
  'scoreBlueFinal': number;
  'scoreBlueFoul': number;
  'scoreBlueAuto': number;
  'teams': {
    'teamNumber': number;
    'station': DriverStation;
    'dq': boolean;
  }[],
};

export type ApiMatchResults = {
  'Matches': ApiMatchResult[];
};

export type ApiRankings = {
  'Rankings': {
    'rank': number;
    'teamNumber': number;
    'sortOrder1': number;
    'sortOrder2': number;
    'sortOrder3': number;
    'sortOrder4': number;
    'sortOrder5': number;
    'sortOrder6': number;
    'wins': number;
    'losses': number;
    'ties': number;
    'qualAverage': number; // Average score of all their qual matches
    'dq': number;
    'matchesPlayed': number;
  }[]
};

export type ApiAlliances = {
  'Alliances': {
    number: number,
    captain: number,
    round1: number,
    round2: number,
    round3?: number,
    backup?: number,
    backupReplaced: number,
    name: string
  }[],
  count: number
};
