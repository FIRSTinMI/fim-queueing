const functions = require("firebase-functions");
const admin = require("firebase-admin");

const {get} = require("./frcEventsApiClient");
import DoubleEliminationBracketMapping, {BracketMatchNumber, ParticipantSource}
  from "../../../shared/DoubleEliminationBracketMapping";
import {ApiAlliances, ApiMatch, ApiMatchResults} from "../apiTypes";
import {DriverStation, Event, PlayoffMatch} from "../../../shared/DbTypes";

/**
 * Attempt to fetch and populate alliances for an event
 * @param {number} season The season of the event
 * @param {Event} event The full event object from RTDB
 * @param {string} eventKey The key to access the event
 */
exports.populateAlliances = async function(season: number, event: Event,
    eventKey: string) {
  let alliances: ApiAlliances | undefined;
  try {
    const {eventCode} = event;
    alliances =
      await get(`/${season}/alliances/${eventCode}`, eventCode) as ApiAlliances;
  } catch (e) {
    // The FRC API seems to just error out sometimes fetching alliances...
    functions.logger.warn(
        `Error while fetching alliances for event ${event.eventCode}`, e);
  }

  if (alliances !== undefined && alliances.count > 0 &&
      alliances.Alliances[0]?.round2) {
    admin
        .database()
        .ref(`/seasons/${season}/alliances/${eventKey}`)
        .set(alliances["Alliances"]);
    event.state = "PlayoffsInProgress";
  }
};

/**
* Update the playoff bracket utilizing match results
* NOTE: The team numbers in each match may not sync up with the alliance info
*       stored in the DB, due to substitutions or other extenuating
*       circumstances.
* @param {number} season The season of the event
* @param {Event} event The full event object from RTDB
* @param {string} eventKey The key to access the event
*/
exports.updatePlayoffBracket = async function(season: number, event: Event,
    eventKey: string) {
  const {eventCode} = event;
  // TODO: Update this hardcoded season which is being used for testing
  const matches = await get(`/${season}/matches/${eventCode}` +
    "?tournamentLevel=playoff", eventCode) as ApiMatchResults;

  const playoffMatchInfo: Partial<
      Record<BracketMatchNumber, PlayoffMatch>> = {};

  /**
   * Figure out which alliance won a match
   * @param {ApiMatch} match Match from the FRC.events API
   * @return {"red" | "blue" | null} Which alliance name won, or null
   */
  function getWinnerFromMatch(match: ApiMatch): "red" | "blue" | null {
    // TODO: This is not good enough to determine a real winner.
    // Since the match is immediately replayed (with a break) this should still
    // be okay
    // See Game manual chapter 11.7.2.1 for tie rules
    if (match.scoreRedFinal > match.scoreBlueFinal) return "red";
    if (match.scoreBlueFinal > match.scoreRedFinal) return "blue";
    return null;
  }

  /**
   * Get the alliance number that won or lost a match
   * @param {BracketMatchNumber} matchNum Which match in the bracket
   * @param {"win" | "lose"} type Get the winner or loser?
   * @return {number | null} The alliance number, or null
   */
  function getResult(matchNum: BracketMatchNumber, type: "win" | "lose")
      : number | null {
    const match = playoffMatchInfo[matchNum];
    if (match === null || match === undefined) return null;
    let allianceToGet = match.winner;
    if (allianceToGet === null) return null;

    if (type === "lose") {
      if (allianceToGet === "red") allianceToGet = "blue";
      else if (allianceToGet === "blue") allianceToGet = "red";
    }

    if (allianceToGet === "red") return match.redAlliance;
    if (allianceToGet === "blue") return match.blueAlliance;

    throw new Error("Unreachable");
  }

  /**
   * Convert a ParticipantSource to an alliance number, using prior matches.
   * @param {ParticipantSource} part The participant source
   * @return {number | undefined} Alliance number, or undefined
   */
  function participantToAllianceNumber(part: ParticipantSource)
      : number | null {
    if ("allianceNumber" in part) {
      return part.allianceNumber;
    }
    if ("winnerFrom" in part) {
      return getResult(part.winnerFrom, "win");
    } else if ("loserFrom" in part) {
      return getResult(part.loserFrom, "lose");
    } else throw new Error("Participant source not as expected");
  }

  DoubleEliminationBracketMapping.matches.forEach((match) => {
    // For now let's just take the first one, it'll be easier
    const matchNum = (match.overrideMatchNumbers ?? [match.number])[0];

    const apiMatch = matches.Matches.find(
        (m) => m.matchNumber === matchNum);

    playoffMatchInfo[match.number] = {
      winner: apiMatch ? getWinnerFromMatch(apiMatch) : null,
      participants: apiMatch?.teams.reduce((prev, team) => ({
        ...prev,
        [team.station]: team.teamNumber,
      }), {}) as any as Record<DriverStation, number> ?? null,
      redAlliance: participantToAllianceNumber(match.participants.red),
      blueAlliance: participantToAllianceNumber(match.participants.blue),
    };
  });

  if (playoffMatchInfo["F"]?.winner) {
    event.state = "EventOver";
  }

  admin
      .database()
      .ref(`/seasons/${season}/bracket/${eventKey}`)
      .set(playoffMatchInfo);
};
