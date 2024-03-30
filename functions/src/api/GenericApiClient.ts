import {
  Alliance, QualMatch, TeamRanking, DriverStation,
} from '../../../shared/DbTypes';
import { BracketMatchNumber } from '../../../shared/DoubleEliminationBracketMapping';

const functions = require('firebase-functions');
const fetch = require('node-fetch');

type ApiContext = {
  lastModifiedMs: number | null,
};

const defaultContext: ApiContext = {
  /**
   * The most recent timestamp for a given event that we know of. Used to report
   * on data staleness.
   */
  lastModifiedMs: null,
};

/**
 * This should be a singleton per type of API, so that context can be correctly
 * tracked.
 */
export default abstract class GenericApiClient {
  private context: {
    [eventCode: string]: ApiContext
  } = {};

  private apiBaseUrl: string;

  private headers: { [_: string]: string } = {};

  protected abstract apiClientName: string;

  /**
   * Initialize the API Client
   */
  constructor(defaultHeaders: { [_: string]: string }, apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  protected async get<TResp>(endpoint: string,
    eventCode: string | undefined = undefined): Promise<TResp> {
    if (!endpoint.startsWith('/')) {
      throw new Error('endpoint must be relative and start with a \'/\'');
    }

    const startTime = performance.now();
    const fetchResult = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: this.headers,
    });
    if (!fetchResult.ok) throw new Error(fetchResult.statusText);

    const lastModified = fetchResult.headers.get('Last-Modified');
    if (lastModified && eventCode) {
      const lastModifiedMs = Date.parse(lastModified);
      let ctx = this.context[eventCode];
      if (!ctx) ctx = defaultContext;
      if (!ctx.lastModifiedMs || ctx.lastModifiedMs < lastModifiedMs) {
        ctx.lastModifiedMs = lastModifiedMs;
      }
    }

    const respJson = await fetchResult.json() as TResp;

    const duration = performance.now() - startTime;
    functions.logger.debug(`fetch apiType(${this.apiClientName}) endpoint(${endpoint}) duration(${duration}ms)`);

    return respJson;
  }

  public getContext(eventCode: string) {
    if (eventCode in this.context) {
      return this.context[eventCode];
    }
    return defaultContext;
  }

  public clearContext(eventCode: string,
    newContext: ApiContext = defaultContext) {
    this.context[eventCode] = newContext;
  }

  /**
   * Get the current match in the qualification level. Pass in lastKnown to start
   * search there, saving some resources since current will never decrease (in
   * this context. It can decrease in assisted mode)
   * @param {string} eventCode Event's code to pass to the underlying API
   * @param {number} season The season the event is in
   * @param {number | undefined} lastKnown Start search here, if passed in
   */
  public abstract getCurrentQualMatch(eventCode: string, season: number,
    lastKnown: number | undefined): Promise<number | null>;
  public abstract getQualSchedule(eventCode: string, season: number): Promise<ScheduleQualMatch[]>;
  // public abstract getPlayoffSchedule(eventCode: string, season: string)
  // : Promise<Partial<PlayoffMatch>[]>;
  // public abstract getPlayoffMatches(eventCode: string, season: number): Promise<MatchResult[]>;
  // public abstract getPlayoffScoreDetails(eventCode: string, season: number)
  // : Promise<ScoreBreakdown[]>;
  public abstract getPlayoffBracket(eventCode: string, season: number, eventKey: string)
  : Promise<Partial<Record<BracketMatchNumber, PlayoffMatchInfo[]>>>;
  public abstract getRankings(eventCode: string, season: number): Promise<TeamRanking[]>;
  public abstract getAlliances(eventCode: string, season: number): Promise<Alliance[] | null>;
}

export type PlayoffMatchInfo = {
  participants: Record<DriverStation, number>,
  winner: 'blue' | 'red' | null
};

export type MatchResult = {
  'matchNumber': number;
  'scoreRedFinal': number;
  'scoreRedFoul': number;
  'scoreRedAuto': number;
  'scoreBlueFinal': number;
  'scoreBlueFoul': number;
  'scoreBlueAuto': number;
  'participants': Record<DriverStation, number>,
};

export type ScheduleQualMatch = QualMatch & {
  schedStart?: Date
};

export type ScoreBreakdown = {
  matchNumber: number;
  red: any;
  blue: any;
};
