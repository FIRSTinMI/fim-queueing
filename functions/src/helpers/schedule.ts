// const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {get} = require("./frcEventsApiClient");
import {
  /* ApiAvatars, */ ApiSchedule,
} from "../apiTypes";

/**
 * Get the qualifications schedule for an event
 * @param {number} season The year
 * @param {string} eventCode The FRC event code
 * @param {string} level The tournament level to fetch the schedule for
 * @return {Promise<ApiSchedule>} The schedule ("Schedule" will be empty if
 *  schedule not posted)
 */
exports.getSchedule = async function(season: number, eventCode: string,
    level: string = "qual"): Promise<ApiSchedule> {
  return await get(`/${season}/schedule/${eventCode}`+
    `?tournamentLevel=${level}`, eventCode) as ApiSchedule;
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

  // const teamsWithAvatars = Object.keys(await admin.database()
  //     .ref(`/seasons/${season}/avatars`).get());

  // const teamsThatNeedAvatars = teamsAtEvent.filter(
  //     (x) => !teamsWithAvatars.includes(x));

  // teamsThatNeedAvatars.forEach(async (team) => {
  //   try {
  //     // Magic string so we know that we already tried this team
  //     let avatar = "NONE";
  //     const avatarJson =
  //       await get(`/${season}/avatars?teamNumber=${team}`) as ApiAvatars;

  //     if ((avatarJson["teams"]?.length ?? 0) > 0 &&
  //           avatarJson["teams"][0]["encodedAvatar"]) {
  //       avatar = avatarJson["teams"][0]["encodedAvatar"];
  //     }

  //     admin.database().ref(`/seasons/${season}/avatars/${team}`).set(
  //         avatar
  //     );
  //   } catch (e) {
  //     functions.logger.warn(`Unable to fetch avatar for team ${team}`);
  //   }
  // });
};
