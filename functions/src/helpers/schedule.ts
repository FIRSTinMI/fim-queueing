// const functions = require("firebase-functions");
import { QualMatch } from '../../../shared/DbTypes';

const admin = require('firebase-admin');

/**
 * Given a schedule, update the schedule in RTDB and fetch avatars
 * @param {ApiSchedule} schedule The list of qualification matches
 * @param {number} season The year
 * @param {string} eventKey The key that corresponds to this event (not the
 *  event code)
 */
exports.updateQualSchedule = async function updateQualSchedule(schedule: QualMatch[],
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
    .set(schedule);
};
