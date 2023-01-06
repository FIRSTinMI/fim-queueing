const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
import {
  ApiAvatars, ApiMatchResults, ApiRankings, ApiSchedule,
} from "./apiTypes";

type EventState = "Pending" | "AwaitingQualSchedule" | "QualsInProgress"
  | "AwaitingAlliances" | "PlayoffsInProgress" | "EventOver";
type Event = {
  state: EventState
  start: string,
  end: string,
  eventCode: string,
  currentMatchNumber: number | undefined,
  mode: "automatic" | "assisted",
  options: {
    showRankings: boolean
  }
}

exports.updateCurrentMatch = async () => {
  // TODO: Uncomment this and remove 2022!
  // const season = (await admin.database().ref("/current_season").get())
  //     .val();
  const season = 2022;

  const token = Buffer.from(process.env.FRC_API_TOKEN as string)
      .toString("base64");

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
      if (eventKey !== "test654321") return;

      if (event.state === "Pending" || event.state === undefined) {
        if (new Date(event.start) <= now &&
          new Date(event.end) >= now && !!event.eventCode) {
          event.state = "AwaitingQualSchedule";
        }
      }

      if (event.state === "AwaitingQualSchedule") {
        // Try to fetch the schedule
        const eventSchedule = (await getSchedule(season, event.eventCode,
            token, ));

        if (eventSchedule["Schedule"] &&
          eventSchedule["Schedule"].length > 0) {
          // Yay, we have a schedule now
          await updateQualSchedule(eventSchedule, season, eventKey, token);
          event.state = "QualsInProgress";
        } else {
          functions.logger.info(`Still no schedule for ${event.eventCode}`);
        }
      }

      if (event.state === "QualsInProgress" && event.mode === "automatic") {
        await setCurrentQualMatch(season, event, eventKey, token);
      }

      if (event.options.showRankings && (event.state === "QualsInProgress" ||
            event.state === "AwaitingAlliances")) {
        // Running this for a bit after qualifications end because rankings
        // don't always immediately update
        await updateRankings(season, event.eventCode, eventKey, token);
      }

      // TODO: Add building of playoff bracket

      if (event.state !== undefined) {
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
 * Get the qualifications schedule for an event
 * @param {number} season The year
 * @param {string} eventCode The FRC event code
 * @param {string} token FRC API token (base-64 encoded)
 * @param {string} level The tournament level to fetch the schedule for
 * @return {Promise<ApiSchedule>} The schedule ("Schedule" will be empty if
 *  schedule not posted)
 */
async function getSchedule(season: number, eventCode: string, token: string,
    level: string = "qual"):
  Promise<ApiSchedule> {
  const url = `https://frc-api.firstinspires.org/v3.0/${season}/schedule/$` +
  `${eventCode}?tournamentLevel=${level}`;
  functions.logger.info("Getting schedule:", url);
  const eventFetch = await fetch(url,
      {
        headers: {
          "Authorization": "Basic " + token,
          "Content-Type": "application/json",
        },
      }
  );
  if (!eventFetch.ok) throw new Error(eventFetch.statusText);

  return await eventFetch.json() as ApiSchedule;
}

/**
 * Given a schedule, update the schedule in RTDB and fetch avatars
 * @param {ApiSchedule} schedule The schedule as returned by the FRC API
 * @param {number} season The year
 * @param {string} eventKey The key that corresponds to this event (not the
 *  event code)
 * @param {string} token FRC API token (base-64 encoded)
 */
async function updateQualSchedule(schedule: ApiSchedule, season: number,
    eventKey: string, token: string): Promise<void> {
  const matchSchedule = schedule["Schedule"];
  admin
      .database()
      .ref(`/seasons/${season}/events/${eventKey}`)
      .update({mode: "automatic", hasQualSchedule: true});

  admin
      .database()
      .ref(`/seasons/${season}/matches/qual/${eventKey}`)
      .set(matchSchedule);

  let teamsAtEvent: any[] = [];
  matchSchedule.forEach((match: any) => {
    match["teams"].forEach(
        (team: any) => teamsAtEvent.push(team["teamNumber"]));
  });
  teamsAtEvent = teamsAtEvent.filter(
      (val, idx, self) => self.indexOf(val) === idx);

  const teamsWithAvatars = Object.keys(await admin.database()
      .ref(`/seasons/${season}/avatars`).get());

  const teamsThatNeedAvatars = teamsAtEvent.filter(
      (x) => !teamsWithAvatars.includes(x));

  teamsThatNeedAvatars.forEach(async (team) => {
    try {
      // Magic string so we know that we already tried this team
      let avatar = "NONE";
      const avatarFetch = await fetch(
          `https://frc-api.firstinspires.org/v3.0/${season}/avatars` +
            `?teamNumber=${team}`,
          {
            headers: {
              "Authorization": "Basic " + token,
              "Content-Type": "application/json",
            },
          }
      );
      if (!avatarFetch.ok) throw new Error(avatarFetch.statusText);

      const avatarJson = await avatarFetch.json() as ApiAvatars;

      if ((avatarJson["teams"]?.length ?? 0) > 0 &&
             avatarJson["teams"][0]["encodedAvatar"]) {
        avatar = avatarJson["teams"][0]["encodedAvatar"];
      }

      admin.database().ref(`/seasons/${season}/avatars/${team}`).set(
          avatar
      );
    } catch (e) {
      functions.logger.warn(`Unable to fetch avatar for team ${team}`);
    }
  });
}

/**
 * Get the most up to date rankings and update the DB
 * @param {number} season Which season we"re in
 * @param {string} eventCode The FRC event code
 * @param {string} eventKey The DB key for the event
 * @param {string} token FRC API token
 */
async function updateRankings(season: number, eventCode: string,
    eventKey: string, token: string): Promise<void> {
  const rankingFetch = await fetch(
      `https://frc-api.firstinspires.org/v3.0/${season}/rankings/` +
        `${eventCode}`,
      {
        headers: {
          "Authorization": "Basic " + token,
          "Content-Type": "application/json",
        },
      }
  );
  if (!rankingFetch.ok) throw new Error(rankingFetch.statusText);

  const rankingJson = await rankingFetch.json() as ApiRankings;

  if ((rankingJson["Rankings"]?.length ?? 0) > 0) {
    const rankings = rankingJson["Rankings"].map((x) => ({
      rank: x.rank, teamNumber: x.teamNumber,
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
 * @param {string} token The FRC Events API token
 * @return {void}
 */
async function setCurrentQualMatch(season: number, event: Event,
    eventKey: string, token: string) {
  try {
    const url = `https://frc-api.firstinspires.org/v3.0/${season}/` +
    `matches/${event.eventCode}?tournamentLevel=qual` +
    `&start=${event.currentMatchNumber ?? 1}`;

    const resultFetch = await fetch(url,
        {
          headers: {
            "Authorization": "Basic " + token,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
    );
    if (!resultFetch.ok) throw new Error(resultFetch.statusText);

    const results = await resultFetch.json() as ApiMatchResults;

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
  } catch (e) {
    functions.logger.error(e);
  }
}
