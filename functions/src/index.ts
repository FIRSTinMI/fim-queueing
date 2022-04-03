const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {updateCurrentMatch} = require("./updateCurrentMatch");

admin.initializeApp();
functions.logger.info("Initialized Firebase app");

exports.updateCurrentMatch = functions.pubsub.schedule("every 1 minutes")
    .onRun(async () => await updateCurrentMatch());

exports.httpUpdateCurrentMatch = functions.https.onRequest(async (_: any, res: any) => {
    try {
        await updateCurrentMatch();
        res.send();
    } catch (e) {
        res.status(500).send(e);
    }
})