import {
  Alliance, DriverStation, QualMatch, TeamRanking,
} from '../../../shared/DbTypes';
import GenericApiClient from './GenericApiClient';

export default class FrcEventsApiClient extends GenericApiClient {
  protected apiClientName: string = 'frc-events';

  constructor(apiKey: string, baseUrl: string = 'https://frc-api.firstinspires.org/v3.0') {
    if (!apiKey) {
      throw new Error('API key is required to initialize FRC Events API Client');
    }
    super({ Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` }, baseUrl);
  }

  /** @inheritdoc */
  public async getCurrentQualMatch(eventCode: string, season: string,
    lastKnown: string | undefined = undefined): Promise<string | null> {
    const resp = await this.get<ApiMatchResults>(
      `/${season}/matches/${eventCode}?tournamentLevel=qual&start=${lastKnown ?? 1}`,
      eventCode,
    );

    const latestMatch = resp.Matches
      .filter((x) => x.actualStartTime != null)
      .sort((x) => -1 * x.matchNumber)[0];

    if (!latestMatch) return null;

    return `${latestMatch.matchNumber + 1}`;
  }

  public async getQualSchedule(eventCode: string, season: string): Promise<QualMatch[]> {
    const resp = await this.get<ApiSchedule>(`/${season}/schedule/${eventCode}?tournamentLevel=qual`, eventCode);

    return resp.Schedule.map((x) => ({
      number: x.matchNumber,
      participants: x.teams.filter((team) => !!team.teamNumber)
        .reduce((prev, team) => ({
          ...prev,
          [team.station]: team.teamNumber,
        }), {} as Record<DriverStation, number>),
    }));
  }

  /** @inheritdoc */
  /* public async getPlayoffSchedule(eventCode: string, season: string)
    : Promise<Partial<PlayoffMatch>[]> {
    const resp = await this.get<ApiSchedule>(
      `/${season}/schedule/${eventCode}?tournamentLevel=playoff`, eventCode);
    return resp.Schedule.map((x) => ({
      number: x.matchNumber,
      participants: x.teams.filter((team) => !!team.teamNumber)
        .reduce((prev, team) => ({
          ...prev,
          [team.station]: team.teamNumber,
        }), {} as Record<DriverStation, number>),
    }));
  } */
  public async getPlayoffMatches(eventCode: string, season: string): Promise<unknown> {
    this.get(`${season}`, eventCode); // TODO
    throw new Error('Method not implemented.');
  }

  public async getRankings(eventCode: string, season: string): Promise<TeamRanking[]> {
    this.get(`${season}`, eventCode); // TODO
    throw new Error('Method not implemented.');
  }

  public async getAlliances(eventCode: string, season: string): Promise<Alliance[] | null> {
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

export type ApiMatchResults = {
  'Matches': {
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
  }[];
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
