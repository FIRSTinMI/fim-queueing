// const functions = require("firebase-functions");
import { Break, QualMatch } from '../../../shared/DbTypes';
import { ScheduleQualMatch } from '../api/GenericApiClient';

const admin = require('firebase-admin');

/**
 * Given a schedule, update the schedule in RTDB
 * @param {ApiSchedule} schedule The list of qualification matches
 * @param {number} season The year
 * @param {string} eventKey The key that corresponds to this event (not the
 *  event code)
 */
exports.updateQualSchedule = async function updateQualSchedule(schedule: ScheduleQualMatch[],
  season: number, eventKey: string): Promise<void> {
  admin
    .database()
    .ref(`/seasons/${season}/events/${eventKey}`)
    .update({
      mode: 'automatic',
      hasQualSchedule: true,
      numQualMatches: schedule.length,
    });

  admin
    .database()
    .ref(`/seasons/${season}/qual/${eventKey}`)
    .set(schedule.map((m) => ({
      number: m.number,
      participants: m.participants,
    } as QualMatch)));

  // Add breaks
  const breaks: Break[] = [];
  for (let i = 0; i < schedule.length - 1; i += 1) {
    const thisStart = schedule[i].schedStart;
    const nextStart = schedule[i + 1].schedStart;
    if (thisStart && nextStart) {
      const hourDifference = (nextStart?.getTime() - thisStart?.getTime()) / 3_600_000;
      if (hourDifference > 4) {
        breaks.push({
          level: 'qual',
          after: schedule[i].number,
          message: 'End of Day',
        });
      } else if (hourDifference > 0.5
        && (thisStart.getHours() >= 12 && thisStart.getHours() <= 13)) {
        breaks.push({
          level: 'qual',
          after: schedule[i].number,
          message: 'Lunch',
        });
      }
    }
  }

  if (breaks.length > 0) {
    admin
      .database()
      .ref(`/seasons/${season}/breaks/${eventKey}`)
      .set(breaks);
  }
};
