const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
import {
  ApiAvatars, ApiSchedule,
} from "../apiTypes";

/**
 * Get the qualifications schedule for an event
 * @param {number} season The year
 * @param {string} eventCode The FRC event code
 * @param {string} token FRC API token (base-64 encoded)
 * @param {string} level The tournament level to fetch the schedule for
 * @return {Promise<ApiSchedule>} The schedule ("Schedule" will be empty if
 *  schedule not posted)
 */
exports.getSchedule = async function(season: number, eventCode: string,
    token: string, level: string = "qual"): Promise<ApiSchedule> {
  const url = `https://frc-api.firstinspires.org/v3.0/${season}/schedule/` +
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
};

/**
 * Given a schedule, update the schedule in RTDB and fetch avatars
 * @param {ApiSchedule} schedule The schedule as returned by the FRC API
 * @param {number} season The year
 * @param {string} eventKey The key that corresponds to this event (not the
 *  event code)
 * @param {string} token FRC API token (base-64 encoded)
 */
exports.updateQualSchedule = async function(schedule: ApiSchedule,
    season: number, eventKey: string, token: string): Promise<void> {
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
};
