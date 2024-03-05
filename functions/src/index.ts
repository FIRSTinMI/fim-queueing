import { Request, Response } from 'firebase-functions';

const functions = require('firebase-functions');
const { onValueWritten } = require('firebase-functions/v2/database');
const admin = require('firebase-admin/app');
const { updateCurrentMatch } = require('./updateCurrentMatch');
const { statusUpdateHandler } = require('./statusUpdateHandler');

admin.initializeApp();
functions.logger.info('Initialized Firebase app');

exports.updateCurrentMatch = functions.pubsub.schedule('every 1 minutes')
  .onRun(async () => {
    await updateCurrentMatch();
  });

exports.notifyStateChanges = onValueWritten({
  ref: '/seasons/{season}/events/{eventKey}/state',
  instance: 'fim-queueing-default-rtdb',
}, async (event: any) => {
  const original = event.data.before.val();
  const updated = event.data.after.val();

  if (!original || !updated) {
    return null;
  }

  await statusUpdateHandler(original, updated, event.params.season, event.params.eventKey);

  return null;
});

exports.reportError = functions.https.onRequest(
  (req: Request, res: Response) => {
    functions.logger.write({
      ...req.body,
      severity: 'ERROR',
      source: 'clientSide',
    });
    res.sendStatus(200);
  },
);

// NOTE: Do not include this function in public deployments
// exports.webUpdateCurrentMatch = functions.https.onRequest(
//   async (_: any, res: any) => {
//     await updateCurrentMatch();
//     res.sendStatus(200);
//   },
// );
