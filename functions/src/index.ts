import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const {updateCurrentMatch} = require("./updateCurrentMatch");

admin.initializeApp();
functions.logger.info("Initialized Firebase app");

exports.updateCurrentMatch = functions.pubsub.schedule("every 1 minutes")
    .onRun(async () => await updateCurrentMatch());
