const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
// eslint no-unused-vars:off   No idea why eslint thinks these aren't being used
import {ApiAvatars, ApiMatchResults, ApiSchedule} from "./apiTypes";

exports.updateCurrentMatch = async () => {
  const season = (await admin.database().ref("/current_season").get())
      .val();

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
    for (const eventKey in events) {
      if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
        continue;
      }

      const event = events[eventKey];

      if (new Date(event.start) > now ||
        new Date(event.end) < now ||
        !event.eventCode) continue;

      if (!(event.hasQualSchedule ?? false)) {
        // Try to fetch the schedule
        const eventSchedule = (await getSchedule(season, event.eventCode,
            token));

        if (eventSchedule["Schedule"] &&
          eventSchedule["Schedule"].length > 0) {
          // Yay, we have a schedule now
          await updateSchedule(eventSchedule, season, eventKey, token);
        } else {
          functions.logger.info(`Still no schedule for ${event.eventCode}`);
          continue;
        }
      }

      if (event.mode !== "automatic") continue;

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

        if (!latestMatch) continue;

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
        continue;
      }
    }
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
 * @return {Promise<ApiSchedule>} The schedule ("Schedule" will be empty if
 *  schedule not posted)
 */
async function getSchedule(season: number, eventCode: string, token: string):
  Promise<ApiSchedule> {
  const url = `https://frc-api.firstinspires.org/v2.0/${season}/schedule/` +
  eventCode + "?tournamentLevel=qual";
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
async function updateSchedule(schedule: ApiSchedule, season: number,
    eventKey: string, token: string): Promise<void> {
  const matchSchedule = schedule["Schedule"];
  admin
      .database()
      .ref(`/seasons/${season}/events/${eventKey}`)
      .update({mode: "automatic", hasQualSchedule: true});

  admin
      .database()
      .ref(`/seasons/${season}/matches/${eventKey}`)
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
          `https://frc-api.firstinspires.org/v2.0/${season}/avatars` +
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
