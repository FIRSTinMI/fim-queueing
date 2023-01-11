const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

const {getSchedule, updateQualSchedule} = require("./helpers/schedule");
import {
  ApiAlliances,
  ApiMatchResults, ApiRankings,
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
    await Promise.all(Object.keys(events).map(async (eventKey: string) => {
      if (!Object.prototype.hasOwnProperty.call(events, eventKey)) {
        return;
      }

      const event: Event = events[eventKey];

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

      if (event.state === "AwaitingAlliances") {
        await populateAlliances(season, event, eventKey, token);
      }

      if (event.state === "PlayoffsInProgress") {
        await updatePlayoffBracket(season, event, eventKey, token);
      }

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

    if (latestMatch.matchNumber > results["Matches"].length) {
      event.state = "AwaitingAlliances";
    }
  } catch (e) {
    functions.logger.error(e);
  }
}

/**
 * a
 * @param {number} season a
 * @param {Event} event a
 * @param {string} eventKey a
 * @param {string} token a
 */
async function populateAlliances(season: number, event: Event, eventKey: string,
    token: string) {
  let alliances: ApiAlliances | undefined;
  try {
    const url = `https://frc-api.firstinspires.org/v3.0/${2022}/alliances/` +
    `${event.eventCode}`;
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

    alliances = await resultFetch.json() as ApiAlliances;
  } catch (e) {
    // The FRC API seems to just error out sometimes fetching alliances...
    functions.logger.warn("Error while fetching alliances", e);
  }

  if (alliances !== undefined && alliances.count > 0) {
    admin
        .database()
        .ref(`/seasons/${season}/alliances/${eventKey}`)
        .set(alliances["Alliances"]);
    event.state = "PlayoffsInProgress";
  }
}

/**
 * a
 * @param {number} season a
 * @param {Event} event a
 * @param {string} eventKey a
 * @param {string} token a
 */
async function updatePlayoffBracket(season: number, event: Event,
    eventKey: string, token: string) {
  const url = `https://frc-api.firstinspires.org/v3.0/${season}/` +
  `matches/${event.eventCode}?tournamentLevel=playoff`;
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

  const matches = await resultFetch.json() as ApiMatchResults;

  const bracketMatchMap: {[level: string]: {[match: number]: number[]}} = {
    qf: {
      1: [1, 5, 9],
      2: [2, 6, 10],
      3: [3, 7, 11],
      4: [4, 8, 12],
    },
    sf: {
      1: [13, 15, 17],
      2: [14, 16, 18],
    },
    f: {
      1: [19, 20, 21],
    },
  };

  /**
   * Get the number of wins for each alliance in a matchup
   * @param {"qf" | "sf" | "f"} level The tournament level
   * @param {number} matchNum The match number
   * @return {{red: number, blue: number}} Wins for each alliance
   */
  function getWins(level: "qf" | "sf" | "f", matchNum: number)
      : {red: number, blue: number} {
    const mapping = bracketMatchMap[level][matchNum];
    if (!mapping) throw new Error(`Unable to find match ${level}${matchNum}`);
    const result = matches.Matches.reduce<{red: number, blue: number}>(
        (wins, match) => {
          if (!mapping.includes(match.matchNumber)) return wins;
          if (match.scoreRedFinal > match.scoreBlueFinal) wins.red += 1;
          else if (match.scoreBlueFinal > match.scoreRedFinal) {
            wins.blue += 1;
          }
          return wins;
        }, {red: 0, blue: 0});

    return result;
  }

  /**
   * a
   * @param {string} level a
   * @param {number} matchNum a
   * @return {number | null} a
   */
  function winnerFrom(level: "qf" | "sf" | "f", matchNum: number)
      : number | null {
    const mapping = bracketMapping[level]
        .find((x: any) => x.number === matchNum);
    if (!mapping) throw new Error(`Unable to find match ${level}${matchNum}`);

    const result = getWins(level, matchNum);
    if (result.red >= 2) return mapping.redAlliance;
    if (result.blue >= 2) return mapping.blueAlliance;
    return null;
  }

  const bracketMapping: {
    [level: string]: {
      name: string, number: number, redAlliance: number | null,
      blueAlliance: number | null, wins: {red: number, blue: number}
    }[]
  } = {};
  bracketMapping.qf = [
    {
      name: "QF1",
      number: 1,
      redAlliance: 1,
      blueAlliance: 8,
      wins: getWins("qf", 1),
    },
    {
      name: "QF2",
      number: 2,
      redAlliance: 4,
      blueAlliance: 5,
      wins: getWins("qf", 2),
    },
    {
      name: "QF3",
      number: 3,
      redAlliance: 2,
      blueAlliance: 7,
      wins: getWins("qf", 3),
    },
    {
      name: "QF4",
      number: 4,
      redAlliance: 3,
      blueAlliance: 6,
      wins: getWins("qf", 4),
    },
  ];
  bracketMapping.sf = [
    {
      name: "SF2",
      number: 1,
      redAlliance: winnerFrom("qf", 1),
      blueAlliance: winnerFrom("qf", 2),
      wins: getWins("sf", 1),
    },
    {
      name: "SF1",
      number: 2,
      redAlliance: winnerFrom("qf", 3),
      blueAlliance: winnerFrom("qf", 4),
      wins: getWins("sf", 2),
    },
  ];
  bracketMapping.f = [
    {
      name: "Finals",
      number: 1,
      redAlliance: winnerFrom("sf", 1),
      blueAlliance: winnerFrom("sf", 2),
      wins: getWins("f", 1),
    },
  ];

  if (winnerFrom("f", 1)) {
    event.state = "EventOver";
  }

  admin
      .database()
      .ref(`/seasons/${season}/bracket/${eventKey}`)
      .set(bracketMapping);
}
