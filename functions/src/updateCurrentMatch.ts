const functions = require("firebase-functions");
const admin = require("firebase-admin");

const {get} = require("./helpers/frcEventsApiClient");
const {getSchedule, updateQualSchedule} = require("./helpers/schedule");
const {
  populateAlliances, updatePlayoffBracket,
} = require("./helpers/playoffs");
import {ApiMatchResults, ApiRankings} from "./apiTypes";
import {Event} from "../../shared/DbTypes";

exports.updateCurrentMatch = async () => {
  const season = (await admin.database().ref("/current_season").get())
      .val();

  const eventsSnap = await admin
      .database()
      .ref(`/seasons/${season}/events`)
      .once("value");

  const events = await eventsSnap.val();

  functions.logger.info("Updating current matches");

  try {
    const now = new Date();
    await Promise.all(Object.keys(events).map(async (eventKey: string) => {
      if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
        return;
      }

      const event: Event = events[eventKey];
      const startingState = event.state;

      if (event.state === "Pending" || event.state === undefined) {
        if (new Date(event.start) <= now &&
          new Date(event.end) >= now && !!event.eventCode) {
          event.state = "AwaitingQualSchedule";
        }
      }

      if (event.state === "AwaitingQualSchedule") {
        // Try to fetch the schedule
        const eventSchedule = (await getSchedule(season, event.eventCode));

        if (eventSchedule["Schedule"] &&
          eventSchedule["Schedule"].length > 0) {
          await updateQualSchedule(eventSchedule, season, eventKey);
          event.state = "QualsInProgress";
        } else {
          functions.logger.info(`Still no schedule for ${event.eventCode}`);
        }
      }

      if (event.state === "QualsInProgress" && event.mode === "automatic") {
        await setCurrentQualMatch(season, event, eventKey);
      }

      if (event.state === "QualsInProgress" ||
        event.state === "AwaitingAlliances") {
        // Running this for a bit after qualifications end because rankings
        // don't always immediately update
        await updateRankings(season, event.eventCode, eventKey);
      }

      if (event.state === "AwaitingAlliances") {
        await populateAlliances(season, event, eventKey);
      }

      if (event.state === "PlayoffsInProgress") {
        await updatePlayoffBracket(season, event, eventKey);
      }

      if (event.state !== undefined && event.state !== startingState) {
        await admin.database()
            .ref(`/seasons/${season}/events/${eventKey}`)
            .update({
              state: event.state,
            });
      }
    }));
  } catch (e) {
    functions.logger.error(e);
    throw e;
  }
};

/**
 * Get the most up to date rankings and update the DB
 * @param {number} season Which season we"re in
 * @param {string} eventCode The FRC event code
 * @param {string} eventKey The DB key for the event
 */
async function updateRankings(season: number, eventCode: string,
    eventKey: string): Promise<void> {
  const rankingJson =
    await get(`/${season}/rankings/${eventCode}`) as ApiRankings;

  if ((rankingJson["Rankings"]?.length ?? 0) > 0) {
    const rankings = rankingJson["Rankings"].map((x) => ({
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
    const results = await get(`/${season}/matches/${event.eventCode}` +
        "?tournamentLevel=qual" +
        `&start=${event.currentMatchNumber ?? 1}`) as ApiMatchResults;

    const latestMatch = results["Matches"]
        .filter((x: any) => x.actualStartTime != null)
        .sort((x: any) => -1 * x.matchNumber)[0];

    if (!latestMatch) return;

    if (latestMatch.matchNumber + 1 != event.currentMatchNumber) {
      functions.logger.info("Updating current match for ", eventKey,
          "to", latestMatch.matchNumber + 1);

      await admin.database()
          .ref(`/seasons/${season}/events/${eventKey}`)
          .update({
            currentMatchNumber: latestMatch.matchNumber + 1,
          });
    }

    if (latestMatch.matchNumber > results["Matches"].length) {
      event.state = "AwaitingAlliances";
    }
  } catch (e) {
    functions.logger.error(e);
  }
}
