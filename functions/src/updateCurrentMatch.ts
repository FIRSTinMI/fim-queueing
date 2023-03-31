import { ApiMatchResults, ApiRankings } from './apiTypes';
import { Alliance, Event } from '../../shared/DbTypes';
import FrcEventsApiClient from './api/frcEventsApiClient';
import GenericApiClient from './api/GenericApiClient';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const { get } = require('./helpers/frcEventsApiClient');
const { updateQualSchedule } = require('./helpers/schedule');
const {
  updatePlayoffBracket,
} = require('./helpers/playoffs');

/**
 * Get the most up to date rankings and update the DB
 * @param {number} season Which season we're in
 * @param {string} eventCode The FRC event code
 * @param {string} eventKey The DB key for the event
 */
async function updateRankings(season: number, eventCode: string,
  eventKey: string): Promise<void> {
  const rankingJson = await get(`/${season}/rankings/${eventCode}`, eventCode) as ApiRankings;

  if ((rankingJson.Rankings?.length ?? 0) > 0) {
    const rankings = rankingJson.Rankings.map((x) => ({
      rank: x.rank,
      teamNumber: x.teamNumber,
      wins: x.wins,
      ties: x.ties,
      losses: x.losses,
      rankingPoints: x.sortOrder1,
      sortOrder2: x.sortOrder2,
      sortOrder3: x.sortOrder3,
      sortOrder4: x.sortOrder4,
    }));

    admin
      .database()
      .ref(`/seasons/${season}/rankings/${eventKey}`)
      .set(rankings);
  }
}

/**
 * Determine from the FRC API what the current quals match is, and update it in
 * RTDB
 * @param {number} season The season of the event
 * @param {Event} event The full event object from RTDB
 * @param {string} eventKey The key to access the event
 * @return {void}
 */
async function setCurrentQualMatch(season: number, event: Event,
  eventKey: string) {
  try {
    const results = await get(`/${season}/matches/${event.eventCode}`
        + '?tournamentLevel=qual'
        + `&start=${event.currentMatchNumber ?? 1}`,
    event.eventCode) as ApiMatchResults;

    const latestMatch = results.Matches
      .filter((x: any) => x.actualStartTime != null)
      .sort((x: any) => -1 * x.matchNumber)[0];

    if (!latestMatch) return;

    if (latestMatch.matchNumber + 1 !== event.currentMatchNumber) {
      functions.logger.info('Updating current match for ', eventKey,
        'to', latestMatch.matchNumber + 1);

      await admin.database()
        .ref(`/seasons/${season}/events/${eventKey}`)
        .update({
          currentMatchNumber: latestMatch.matchNumber + 1,
        });

      const lastScheduledMatchNumber = event.numQualMatches;
      if (lastScheduledMatchNumber
        && latestMatch.matchNumber + 1 > lastScheduledMatchNumber) {
        event.state = 'AwaitingAlliances';
      }
    }
  } catch (e) {
    functions.logger.error(e);
  }
}

exports.updateCurrentMatch = async function updateCurrentMatch() {
  const season = (await admin.database().ref('/current_season').get())
    .val();

  const eventsSnap = await admin
    .database()
    .ref(`/seasons/${season}/events`)
    .once('value');

  const events = await eventsSnap.val();

  functions.logger.info('Updating current matches');

  const apiClients: { [_: string]: GenericApiClient } = {
    frcEvents: new FrcEventsApiClient(process.env.FRC_API_TOKEN as string),
  };

  try {
    const now = new Date();
    await Promise.all(Object.keys(events).map(async (eventKey: string) => {
      if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
        return;
      }

      const event: Event = events[eventKey];
      const apiClient = apiClients[event.dataSource ?? 'frcEvents'];
      apiClient.clearContext(event.eventCode, {
        lastModifiedMs: event.lastModifiedMs ?? null,
      });

      const startingState = event.state;

      if (event.state === 'Pending' || event.state === undefined) {
        if (new Date(event.start) <= now
          && new Date(event.end) >= now && !!event.eventCode) {
          event.state = 'AwaitingQualSchedule';
        }
      }

      if (event.state === 'AwaitingQualSchedule') {
        // Try to fetch the schedule
        const qualSchedule = await apiClient.getQualSchedule(event.eventCode, season);

        if (qualSchedule.length > 0) {
          await updateQualSchedule(qualSchedule, season, eventKey);
          event.state = 'QualsInProgress';
        } else {
          functions.logger.info(`Still no schedule for ${event.eventCode}`);
        }
      }

      if (event.state === 'QualsInProgress' && event.mode === 'automatic') {
        await setCurrentQualMatch(season, event, eventKey);
      }

      if (event.state === 'QualsInProgress'
        || event.state === 'AwaitingAlliances') {
        // Running this for a bit after qualifications end because rankings
        // don't always immediately update
        await updateRankings(season, event.eventCode, eventKey);
      }

      if (event.state === 'AwaitingAlliances') {
        let alliances: Alliance[];
        try {
          alliances = apiClient.getAlliances(event.eventCode, season);
        } catch (e) {
          // The FRC API seems to just error out sometimes fetching alliances...
          functions.logger.warn(
            `Error while fetching alliances for event ${event.eventCode}`, e,
          );
          return;
        }

        if (alliances !== undefined && alliances.length > 0
            && alliances[0]?.round2) {
          admin
            .database()
            .ref(`/seasons/${season}/alliances/${eventKey}`)
            .set(alliances);
          event.state = 'PlayoffsInProgress';
        }
      }

      if (event.state === 'PlayoffsInProgress') {
        await updatePlayoffBracket(season, event, eventKey);
      }

      const apiContext = apiClient.getContext(event.eventCode);
      if ((event.state !== undefined && event.state !== startingState)
          || (apiContext.lastModifiedMs
            && event.lastModifiedMs !== apiContext.lastModifiedMs)) {
        await admin.database()
          .ref(`/seasons/${season}/events/${eventKey}`)
          .update({
            state: event.state,
            lastModifiedMs: apiContext.lastModifiedMs,
          } as Partial<Event>);
      }
    }));
  } catch (e) {
    functions.logger.error(e);
    throw e;
  }
};
