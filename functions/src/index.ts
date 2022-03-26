import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const fetch = require("node-fetch");

type ApiSchedule = {
  "Schedule": {
    "field": string;
    "tournamentLevel": string;
    "description": string;
    "startTime": string;
    "matchNumber": number;
    "teams": {
        "teamNumber": number;
        "station": string;
        "surrogate": boolean;
      }[]
  }[]
}

type ApiAvatars = {
  "teams": {
      "teamNumber": number;
      "encodedAvatar": string
    }[];
  "teamCountTotal": number,
  "teamCountPage": number,
  "pageCurrent": number,
  "pageTotal": number
}

type ApiMatchResults = {
  "Matches": {
    "actualStartTime": string;
    "tournamentLevel": string;
    "postResultTime": string;
    "description": string;
    "matchNumber": number;
    "scoreRedFinal": number;
    "scoreRedFoul": number;
    "scoreRedAuto": number;
    "scoreBlueFinal": number;
    "scoreBlueFoul": number;
    "scoreBlueAuto": number;
    "teams": {
        "teamNumber": number;
        "station": string;
        "dq": boolean;
      }[],
    }[];
}

admin.initializeApp();
functions.logger.info("Initialized Firebase app");

exports.generateSchedule = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST" || !req.body) {
    res.status(400).send();
    return;
  }

  const eventKey = req.body;

  functions.logger.debug("Got event key", eventKey);

  const token = Buffer.from(process.env.FRC_API_TOKEN as string)
      .toString("base64");

  // Get the event data from the DB based on key
  try {
    const season = (await admin.database().ref("/current_season").get()).val();

    const eventSnap = await admin
        .database()
        .ref(`/events/${season}/${eventKey}`)
        .once("value");

    const event: any = eventSnap.val();
    if (!event || (event.matches?.length ?? 0) !== 0) {
      functions.logger.info("Bailing out, event doesn't exist or it has " +
        "matches already");
      res.status(400).send();
      return;
    }

    const eventSchedule = await getSchedule(season, event.eventCode, token);

    updateSchedule(eventSchedule, season, eventKey, token);

    res.send(
        `${eventSchedule["Schedule"].length} matches added to queueing system`);
  } catch (e) {
    functions.logger.error(e);
    res.status(500).send();
  }
});

exports.updateCurrentMatch = functions.pubsub.schedule("every 1 minutes")
    .onRun(async (ctx) => {
      const season = (await admin.database().ref("/current_season").get())
          .val();

      const token = Buffer.from(process.env.FRC_API_TOKEN as string)
          .toString("base64");

      const eventsSnap = await admin
          .database()
          .ref(`/events/${season}`)
          .once("value");

      const events = await eventsSnap.val();

      functions.logger.info("Updating current matches");

      try {
        const now = new Date();
        for (const eventKey in events) {
          if (eventKey === "avatars" ||
            !Object.prototype.hasOwnProperty.call(events, eventKey)) {
            continue;
          }

          const event = events[eventKey];

          if (new Date(event.start) > now ||
            new Date(event.end) < now ||
            !event.eventCode) continue;

          if ((event.matches?.length ?? 0) <= 0) {
            // Try to fetch the schedule
            const eventSchedule = (await getSchedule(season, event.eventCode,
                token));

            if (eventSchedule["Schedule"] &&
              eventSchedule["Schedule"].length > 0) {
              // Yay, we have a schedule now
              await updateSchedule(eventSchedule, season, eventKey, token);
            } else {
              functions.logger.info(`Still no schedule for ${event.eventCode}`);
              return;
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

              await admin.database().ref(`/events/${season}/${eventKey}`)
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
    });

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
      .ref(`/events/${season}/${eventKey}`)
      .update({matches: matchSchedule, mode: "automatic"});

  let teamsAtEvent: any[] = [];
  matchSchedule.forEach((match: any) => {
    match["teams"].forEach(
        (team: any) => teamsAtEvent.push(team["teamNumber"]));
  });
  teamsAtEvent = teamsAtEvent.filter(
      (val, idx, self) => self.indexOf(val) === idx);

  const teamsWithAvatars = Object.keys(await admin.database()
      .ref("/events/2022/avatars").get());

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

      admin.database().ref(`/events/${season}/avatars/${team}`).set(
          avatar
      );
    } catch (e) {
      functions.logger.warn(`Unable to fetch avatar for team ${team}`);
    }
  });
}
