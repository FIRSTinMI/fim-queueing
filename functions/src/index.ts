import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const fetch = require("isomorphic-fetch");

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

admin.initializeApp();
functions.logger.info("Initialized Firebase app");

exports.generateSchedule = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST" || !req.body) {
    res.status(400).send();
    return;
  }

  const eventKey = req.body;

  functions.logger.debug("Got event key", eventKey);

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
        "matches already or doesn't exist");
      res.status(400).send();
      return;
    }

    const token = Buffer.from(process.env.FRC_API_TOKEN as string)
        .toString("base64");

    const eventFetch = await fetch(
        `https://frc-api.firstinspires.org/v2.0/${season}/schedule/` +
        event.eventCode +
        "?tournamentLevel=qual",
        {
          headers: {
            "Authorization": "Basic " + token,
            "Content-Type": "application/json",
          },
        }
    );
    if (!eventFetch.ok) throw new Error(eventFetch.statusText);

    const eventJson = await eventFetch.json();
    if (!eventJson["Schedule"] || eventJson["Schedule"].length === 0) {
      functions.logger.info("Bailing out, schedule doesn't exist or is empty");
      res.status(400).send();
      return;
    }

    admin
        .database()
        .ref(`/events/${season}/${eventKey}/matches`)
        .set(eventJson["Schedule"]);

    let teamsAtEvent: any[] = [];
    eventJson["Schedule"].forEach((match: any) => {
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
        if (!avatarFetch.ok) throw new Error(eventFetch.statusText);

        const avatarJson = await avatarFetch.json();

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

    res.send(
        `${eventJson["Schedule"].length} matches added to queueing system`);
  } catch (e) {
    functions.logger.error(e);
    res.status(500).send();
  }
});
