import {
  Alliance, DriverStation, QualMatch, TeamRanking,
} from '../../../shared/DbTypes';
import DoubleEliminationBracketMapping, { BracketMatchNumber } from '../../../shared/DoubleEliminationBracketMapping';
import GenericApiClient, { PlayoffMatchInfo } from './GenericApiClient';

type SimpleMatchAlliance = {
  dq_team_keys: string[],
  score: number | null, // -1 or null if unplayed
  surrogate_team_keys: string[],
  team_keys: string[],
};
type SimpleMatch = {
  key: string,
  comp_level: string,
  set_number: number | null,
  match_number: number,
  alliances: {
    red: SimpleMatchAlliance,
    blue: SimpleMatchAlliance
  },
  winning_alliance: 'red' | 'blue' | null,
  event_key: string,
  time: number | null,
  predicted_time: number | null,
  actual_time: number | null,
};

export default class BlueAllianceApiClient extends GenericApiClient {
  protected apiClientName: string = 'blueAlliance';

  constructor(apiKey: string, baseUrl: string = 'https://www.thebluealliance.com/api/v3') {
    if (!apiKey) {
      throw new Error('API key is required to initialize Blue Alliance API Client');
    }
    super({ 'X-TBA-Auth-Key': apiKey }, baseUrl);
  }

  /** @inheritdoc */
  public async getCurrentQualMatch(eventCode: string, _season: number,
    _lastKnown: number | undefined = undefined): Promise<number | null> {
    const resp = await this.get<SimpleMatch[]>(`/event/${eventCode}/matches/simple`);
    const latestMatch = resp
      .filter((m) => m.comp_level === 'qm' && (
        BlueAllianceApiClient.isNotNullOrNegative(m.alliances.red.score)
        || BlueAllianceApiClient.isNotNullOrNegative(m.alliances.blue.score)))
      .sort((a, b) => b.match_number - a.match_number)[0];

    if (!latestMatch) return null;
    return latestMatch.match_number + 1;
  }

  /** @inheritdoc */
  public async getQualSchedule(eventCode: string, _season: number): Promise<QualMatch[]> {
    const resp = await this.get<SimpleMatch[]>(`/event/${eventCode}/matches/simple`);
    return resp.filter((m) => m.comp_level === 'qm').map((m) => ({
      number: m.match_number,
      participants: BlueAllianceApiClient.AllianceTeamsToParticipants(m.alliances),
    }));
  }

  /** @inheritdoc */
  public async getPlayoffBracket(eventCode: string, _season: number, _eventKey: string)
    : Promise<Partial<Record<BracketMatchNumber, PlayoffMatchInfo[]>>> {
    const resp = await this.get<SimpleMatch[]>(`/event/${eventCode}/matches/simple`);
    const playoffMatches = resp.filter((m) => ['qf', 'sf', 'f'].includes(m.comp_level));
    const bracket: Partial<Record<BracketMatchNumber, PlayoffMatchInfo[]>> = {};
    // Assuming 8 alliance double elimination
    DoubleEliminationBracketMapping.matches.forEach((bm) => {
      if (bm.number === 'F') {
        const finalMatches = playoffMatches.filter((m) => m.comp_level === 'f');
        bracket.F = finalMatches.length ? finalMatches.map((m) => ({
          participants: BlueAllianceApiClient.AllianceTeamsToParticipants(m.alliances),
          winner: m.winning_alliance !== null ? m.winning_alliance : null,
        } as PlayoffMatchInfo)) : undefined;
      } else {
        const matchResult = playoffMatches.find((m) => m.comp_level === 'sf' && m.set_number === bm.number);
        if (matchResult) {
          bracket[bm.number] = [{
            participants: BlueAllianceApiClient.AllianceTeamsToParticipants(matchResult.alliances),
            winner: matchResult.winning_alliance !== null ? matchResult.winning_alliance : null,
          }];
        }
      }
    });
    return bracket;
  }

  /** @inheritdoc */
  public async getRankings(eventCode: string, _season: number): Promise<TeamRanking[]> {
    const resp = await this.get<ApiRankings>(`/event/${eventCode}/rankings`, eventCode);
    if (!resp || !resp.rankings) return [];

    return resp.rankings.map((r) => ({
      rank: r.rank,
      teamNumber: Number.parseInt(r.team_key.replace(/[^0-9]/g, ''), 10),
      rankingPoints: r.sort_orders[0],
      sortOrder2: r.sort_orders[1],
      sortOrder3: r.sort_orders[2],
      sortOrder4: r.sort_orders[3],
      wins: r.record.wins,
      ties: r.record.ties,
      losses: r.record.losses,
    } as TeamRanking));
  }

  /** @inheritdoc */
  public async getAlliances(eventCode: string, _season: number): Promise<Alliance[] | null> {
    const resp = await this.get<ApiAlliance[]>(`/event/${eventCode}/alliances`);
    if (!resp || !resp.length || !resp[0].picks[0]) {
      return null;
    }
    return resp.map((a, idx) => ({
      number: idx + 1,
      shortName: a.name?.replace('Alliance', '').trim() ?? `${idx + 1}`,
      teams: [...a.picks, a.backup?.in]
        .map(BlueAllianceApiClient.teamKeyToTeamNumber)
        .filter((t) => !!t),
    }));
  }

  private static teamKeyToTeamNumber(teamKey: string | undefined): number {
    if (!teamKey) return null as unknown as number;
    const parsed = Number.parseInt(teamKey.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(parsed)) return null as unknown as number;
    return parsed;
  }

  private static isNotNullOrNegative(num: number | null): boolean {
    return num !== null && num > 0;
  }

  private static AllianceTeamsToParticipants(
    allianceTeams: { red: SimpleMatchAlliance, blue: SimpleMatchAlliance, },
  )
    : Record<DriverStation, number> {
    return {
      Red1: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.red.team_keys[0]),
      Red2: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.red.team_keys[1]),
      Red3: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.red.team_keys[2]),
      Blue1: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.blue.team_keys[0]),
      Blue2: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.blue.team_keys[1]),
      Blue3: BlueAllianceApiClient.teamKeyToTeamNumber(allianceTeams.blue.team_keys[2]),
    };
  }
}

type ApiRankings = {
  'rankings': {
    'rank': number;
    'team_key': string;
    'sort_orders': number[]
    'record': {
      'wins': number;
      'losses': number;
      'ties': number;
    }
    'qual_average': number; // Average score of all their qual matches
    'dq': number;
    'matches_played': number;
  }[]
};

type ApiAlliance = {
  picks: string[],
  name: string,
  backup: {
    in: string,
    out: string
  } | undefined
};
