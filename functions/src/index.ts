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

    const eventJson = await eventFetch.json() as ApiSchedule;
    if (!eventJson["Schedule"] || eventJson["Schedule"].length === 0) {
      functions.logger.info("Bailing out, schedule doesn't exist or is empty");
      res.status(400).send();
      return;
    }

    admin
        .database()
        .ref(`/events/${season}/${eventKey}`)
        .update({matches: eventJson["Schedule"], mode: "automatic"});

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

    res.send(
        `${eventJson["Schedule"].length} matches added to queueing system`);
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
          if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
            continue;
          }

          const event = events[eventKey];

          if (!(event.mode === "automatic" &&
            (event.matches?.length ?? 0) > 0 &&
            new Date(event.start) < now &&
            new Date(event.end) > now)) continue;

          try {
            const url = `https://frc-api.firstinspires.org/v3.0/${season}/` +
            `matches/${event.eventCode}?tournamentLevel=qual` +
            `&start=${event.currentMatchNumber ?? 1}`;

            functions.logger.info(url);
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
