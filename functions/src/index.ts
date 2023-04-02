import {Request, Response} from "firebase-functions";

const functions = require("firebase-functions");
const admin = require("firebase-admin/app");
const {updateCurrentMatch} = require("./updateCurrentMatch");
const {initializeFrcEventsClient} = require("./helpers/frcEventsApiClient");

admin.initializeApp();
functions.logger.info("Initialized Firebase app");

exports.updateCurrentMatch = functions.pubsub.schedule("every 1 minutes")
    .onRun(async () => {
      initializeFrcEventsClient(process.env.FRC_API_TOKEN as string);
      return await updateCurrentMatch();
    });

exports.reportError = functions.https.onRequest(
    (req: Request, res: Response) => {
      functions.logger.write({
        ...req.body,
        "severity": "ERROR",
        "source": "clientSide",
      });
      res.sendStatus(200);
    });

// NOTE: Do not include this function in public deployments
// exports.webUpdateCurrentMatch = functions.https.onRequest(
//     async (_: any, res: any) => {
//       initializeFrcEventsClient(process.env.FRC_API_TOKEN as string);
//       await updateCurrentMatch();
//       res.sendStatus(200);
//     });
