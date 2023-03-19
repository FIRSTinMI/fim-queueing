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
  const matches = await get(`/${season}/matches/${eventCode}` +
    "?tournamentLevel=playoff", eventCode) as ApiMatchResults;

  const playoffMatchInfo: Partial<
      Record<BracketMatchNumber, PlayoffMatch>> = {};

  let scoreDetails: any = undefined;
  /**
   * Find the winner for a particulat match in the schedule. Factor in tiebreak
   * rules if applicable
   * @param {ApiMatch} match Match results from the FRC API
   * @param {BracketMatchNumber} bracketMatchNumber The match number in the
   * bracket
   * @return {Promise<"red" | "blue" | null>} The winner, or null if no winner
   */
  async function getWinnerFromMatch(match: ApiMatch,
      bracketMatchNumber: BracketMatchNumber): Promise<"red" | "blue" | null> {
    if (match.scoreRedFinal === null || match.scoreBlueFinal === null) {
      return null;
    }
    if (match.scoreRedFinal > match.scoreBlueFinal) return "red";
    if (match.scoreBlueFinal > match.scoreRedFinal) return "blue";

    if (bracketMatchNumber === "F") {
      // Finals don't have any tiebreak rules, they just get sent to overtime.
      // Right now we're not handling overtime matches. I'm okay with just not
      // declaring a winner of the tournament in this system.
      return null;
    }

    // The score details endpoint is season-specific
    if (season !== 2023) {
      throw new Error("Unable to handle game-specific tiebreak rules for " +
          "other seasons");
    }

    // We have a tie, let's make sure we haven't already calculated a winner
    // See Game manual chapter 11.7.2.1 for tie rules
    const winner = (await admin.database()
        .ref(`/seasons/${season}/bracket/${eventKey}/${bracketMatchNumber}` +
        "/winner")
        .get()).val();
    if (winner !== null && winner !== undefined) return winner;

    functions.logger.info("Need to fetch score details for match",
        bracketMatchNumber);
    if (scoreDetails === undefined) {
      scoreDetails = await get(`/${season}/scores/${eventCode}/playoff`,
          eventCode) as any;
    }

    const matchDetails = scoreDetails.MatchScores
        .find((x: any) => x.matchNumber === match.matchNumber);
    const redAlliance = matchDetails.alliances
        .find((x: any) => x.alliance === "Red");
    const blueAlliance = matchDetails.alliances
        .find((x: any) => x.alliance === "Blue");

    // Alliance with the most tech foul points wins
    if (redAlliance.techFoulCount > blueAlliance.techFoulCount) return "blue";
    if (blueAlliance.techFoulCount > redAlliance.techFoulCount) return "red";

    // Alliance with most charge station points wins
    if (redAlliance.totalChargeStationPoints >
        blueAlliance.totalChargeStationPoints) return "red";
    if (blueAlliance.totalChargeStationPoints >
          redAlliance.totalChargeStationPoints) return "blue";

    // Alliance with most autonomous points wins
    if (redAlliance.autoPoints > blueAlliance.autoPoints) return "red";
    if (blueAlliance.autoPoints > redAlliance.autoPoints) return "blue";

    return null;
  }

  /**
   * Figure out which alliance won a matchup
   * @param {ApiMatch[]} matches Matches from the FRC.events API
   * @param {BracketMatchNumber} bracketMatchNumber Match number in the bracket
   * @param {number | undefined} numWins Number of wins required to be the
   * overall winner
   * @return {"red" | "blue" | null} Which alliance name won, or null
   */
  async function getWinnerFromMatches(matches: ApiMatch[],
      bracketMatchNumber: BracketMatchNumber, numWins: number = 1):
      Promise<"red" | "blue" | null> {
    const wins = await Promise.all(matches.map(async (match) => {
      return await getWinnerFromMatch(match, bracketMatchNumber);
    }));

    if (wins.filter((w) => w === "red").length >= numWins) return "red";
    if (wins.filter((w) => w === "blue").length >= numWins) return "blue";
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

  let lastMatchWithWinner: BracketMatchNumber | undefined = undefined;
  for (const match of DoubleEliminationBracketMapping.matches) {
    // For now let's just take the first one, it'll be easier
    const matchNums = (match.overrideMatchNumbers ?? [match.number]);

    const apiMatches = <ApiMatch[]>matchNums.map(
        (mn) => matches.Matches.find((am) => am.matchNumber === mn)
    ).filter((m) => m !== undefined);

    const winner = await getWinnerFromMatches(apiMatches, match.number,
        match.winsRequired);
    playoffMatchInfo[match.number] = {
      winner,
      participants: apiMatches[0]?.teams.filter((team) => team.teamNumber !== 0)
          .reduce((prev, team) => ({
            ...prev,
            [team.station]: team.teamNumber,
          }), {}) as any as Record<DriverStation, number> ?? null,
      redAlliance: participantToAllianceNumber(match.participants.red),
      blueAlliance: participantToAllianceNumber(match.participants.blue),
    };
    if (winner) {
      lastMatchWithWinner = match.number;
    }
  }

  const currentMatchNumber = lastMatchWithWinner !== undefined ?
      DoubleEliminationBracketMapping.matches[
          DoubleEliminationBracketMapping.matches
              .findIndex((x) => x.number == lastMatchWithWinner)+1]?.number :
    undefined;
  if (lastMatchWithWinner != event.playoffMatchNumber) {
    await admin.database()
        .ref(`/seasons/${season}/events/${eventKey}`)
        .update({
          playoffMatchNumber: currentMatchNumber ?? null,
        });
  }

  if (playoffMatchInfo["F"]?.winner) {
    event.state = "EventOver";
  }

  admin
      .database()
      .ref(`/seasons/${season}/bracket/${eventKey}`)
      .set(playoffMatchInfo);
};
