import { Alliance, Event } from '../../shared/DbTypes';
import BlueAllianceApiClient from './api/BlueAllianceApiClient';
import FrcEventsApiClient from './api/FrcEventsApiClient';
import GenericApiClient from './api/GenericApiClient';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// const { get } = require('./helpers/frcEventsApiClient');
const { updateQualSchedule } = require('./helpers/schedule');
const {
  updatePlayoffBracket,
} = require('./helpers/playoffs');

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
    blueAlliance: new BlueAllianceApiClient(process.env.TBA_API_TOKEN as string),
  };

  try {
    const now = new Date();
    await Promise.all(Object.keys(events).map(async (eventKey: string) => {
      if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
        return;
      }

      const event: Event = events[eventKey];
      const apiClient = apiClients[event.dataSource ?? 'frcEvents'];
      if (!apiClient) throw new Error('Unknown API provider supplied');
      apiClient.clearContext(event.eventCode, {
        lastModifiedMs: event.lastModifiedMs ?? null,
      });

      const startingState = event.state;

      // When event is current, start the process
      if (event.state === 'Pending' || event.state === undefined) {
        if (new Date(event.start) <= now
          && new Date(event.end) >= now && !!event.eventCode) {
          event.state = 'AwaitingQualSchedule';
        }
      }

      // Try to fetch the schedule
      if (event.state === 'AwaitingQualSchedule') {
        const qualSchedule = await apiClient.getQualSchedule(event.eventCode, season);

        if (qualSchedule.length > 0) {
          await updateQualSchedule(qualSchedule, season, eventKey);
          event.state = 'QualsInProgress';
        } else {
          functions.logger.info(`Still no schedule for ${event.eventCode}`);
        }
      }

      // Update current qual match
      if (event.state === 'QualsInProgress') {
        try {
          const currentMatch = await apiClient.getCurrentQualMatch(
            event.eventCode, season, event.currentMatchNumber ?? undefined,
          );

          if (currentMatch) {
            if (currentMatch !== event.currentMatchNumber) {
              functions.logger.info('Updating current match for ', eventKey,
                'to', currentMatch);

              await admin.database()
                .ref(`/seasons/${season}/events/${eventKey}`)
                .update({
                  currentMatchNumber: currentMatch,
                });

              const lastScheduledMatchNumber = event.numQualMatches;
              if (lastScheduledMatchNumber
                && currentMatch > lastScheduledMatchNumber) {
                event.state = 'AwaitingAlliances';
              }
            }
          }
        } catch (e) {
          functions.logger.error(e);
        }
      }

      // Fetch qual rankings
      if (event.state === 'QualsInProgress'
        || event.state === 'AwaitingAlliances') {
        // Running this for a bit after qualifications end because rankings
        // don't always immediately update
        const rankings = await apiClient.getRankings(event.eventCode, season);
        if (rankings.length) {
          admin
            .database()
            .ref(`/seasons/${season}/rankings/${eventKey}`)
            .set(rankings);
        }
      }

      // Try to fetch alliances
      if (event.state === 'AwaitingAlliances') {
        let alliances: Alliance[] | null;
        try {
          alliances = await apiClient.getAlliances(event.eventCode, season);
        } catch (e) {
          // The FRC API seems to just error out sometimes fetching alliances...
          functions.logger.warn(
            `Error while fetching alliances for event ${event.eventCode}`, e,
          );
          return;
        }

        if (alliances !== null) {
          admin
            .database()
            .ref(`/seasons/${season}/alliances/${eventKey}`)
            .set(alliances);
          event.state = 'PlayoffsInProgress';
        }
      }

      // Update the playoff bracket
      if (event.state === 'PlayoffsInProgress') {
        await updatePlayoffBracket(season, event, eventKey, apiClient);
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
