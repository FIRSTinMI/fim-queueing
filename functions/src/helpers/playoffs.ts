import DoubleEliminationBracketMapping, { BracketMatchNumber, ParticipantSource }
  from '../../../shared/DoubleEliminationBracketMapping';
import { Event, PlayoffMatch } from '../../../shared/DbTypes';
import GenericApiClient, { PlayoffMatchInfo } from '../api/GenericApiClient';

// const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
* Update the playoff bracket utilizing match results
* NOTE: The team numbers in each match may not sync up with the alliance info
*       stored in the DB, due to substitutions or other extenuating
*       circumstances.
* @param {number} season The season of the event
* @param {Event} event The full event object from RTDB
* @param {string} eventKey The key to access the event
*/
exports.updatePlayoffBracket = async function updatePlayoffBracket(season: number, event: Event,
  eventKey: string, apiClient: GenericApiClient) {
  const { eventCode } = event;
  const matches = await apiClient.getPlayoffBracket(eventCode, season);

  const playoffMatchInfo: Partial<Record<BracketMatchNumber, PlayoffMatch>> = {};

  /**
   * Figure out which alliance won a matchup
   * @param {MatchResult[]} apiMatches Matches from the FRC.events API
   * @param {BracketMatchNumber} _bracketMatchNumber Match number in the bracket
   * @param {number | undefined} numWins Number of wins required to be the
   * overall winner
   * @return {"red" | "blue" | null} Which alliance name won, or null
   */
  function getWinnerFromMatches(apiMatches: PlayoffMatchInfo[],
    _bracketMatchNumber: BracketMatchNumber, numWins: number = 1): 'red' | 'blue' | null {
    const wins = apiMatches.map((m) => m.winner);

    if (wins.filter((w) => w === 'red').length >= numWins) return 'red';
    if (wins.filter((w) => w === 'blue').length >= numWins) return 'blue';
    return null;
  }

  /**
   * Get the alliance number that won or lost a match
   * @param {BracketMatchNumber} matchNum Which match in the bracket
   * @param {"win" | "lose"} type Get the winner or loser?
   * @return {number | null} The alliance number, or null
   */
  function getResult(matchNum: BracketMatchNumber, type: 'win' | 'lose')
    : number | null {
    const match = playoffMatchInfo[matchNum];
    if (match === null || match === undefined) return null;
    let allianceToGet = match.winner;
    if (allianceToGet === null) return null;

    if (type === 'lose') {
      if (allianceToGet === 'red') allianceToGet = 'blue';
      else if (allianceToGet === 'blue') allianceToGet = 'red';
    }

    if (allianceToGet === 'red') return match.redAlliance;
    if (allianceToGet === 'blue') return match.blueAlliance;

    throw new Error('Unreachable');
  }

  /**
   * Convert a ParticipantSource to an alliance number, using prior matches.
   * @param {ParticipantSource} part The participant source
   * @return {number | undefined} Alliance number, or undefined
   */
  function participantToAllianceNumber(part: ParticipantSource)
    : number | null {
    if ('allianceNumber' in part) {
      return part.allianceNumber;
    }
    if ('winnerFrom' in part) {
      return getResult(part.winnerFrom, 'win');
    } if ('loserFrom' in part) {
      return getResult(part.loserFrom, 'lose');
    } throw new Error('Participant source not as expected');
  }

  let lastMatchWithWinner: BracketMatchNumber | undefined;
  DoubleEliminationBracketMapping.matches.forEach((match) => {
    // For now let's just take the first one, it'll be easier
    // const matchNums = (match.overrideMatchNumbers ?? [match.number]);

    const apiMatches = matches[match.number.toString() as any] ?? [];

    // eslint-disable-next-line no-await-in-loop
    const winner = getWinnerFromMatches(apiMatches, match.number,
      match.winsRequired);
    playoffMatchInfo[match.number] = {
      winner,
      participants: apiMatches[0]?.participants ?? null,
      redAlliance: participantToAllianceNumber(match.participants.red),
      blueAlliance: participantToAllianceNumber(match.participants.blue),
    };
    if (winner) {
      lastMatchWithWinner = match.number;
    }
  });

  const currentMatchNumber = lastMatchWithWinner !== undefined
    ? DoubleEliminationBracketMapping.matches[
      DoubleEliminationBracketMapping.matches
        .findIndex((x) => x.number === lastMatchWithWinner) + 1]?.number
    : undefined;
  if (currentMatchNumber !== event.playoffMatchNumber) {
    await admin.database()
      .ref(`/seasons/${season}/events/${eventKey}`)
      .update({
        playoffMatchNumber: currentMatchNumber ?? null,
      });
  }

  if (playoffMatchInfo.F?.winner) {
    event.state = 'EventOver';
  }

  admin
    .database()
    .ref(`/seasons/${season}/bracket/${eventKey}`)
    .set(playoffMatchInfo);
};
