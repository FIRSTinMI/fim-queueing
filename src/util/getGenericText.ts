import { ParticipantSource } from '@shared/DoubleEliminationBracketMapping';

function getGenericText(part: ParticipantSource | undefined): string {
  if (part === undefined) return '';

  if ('winnerFrom' in part) {
    return `Winner of M${part.winnerFrom}`;
  }
  if ('loserFrom' in part) {
    return `Loser of M${part.loserFrom}`;
  }
  if ('allianceNumber' in part) {
    return `Alliance ${part.allianceNumber}`;
  }
  throw new Error('ParticipantSource not as expected');
}

export default getGenericText;
