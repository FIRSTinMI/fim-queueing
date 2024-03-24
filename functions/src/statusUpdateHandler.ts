import { Event } from '../../shared/DbTypes';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { WebClient } = require('@slack/web-api');

let slackClient: typeof WebClient | undefined;

exports.statusUpdateHandler = async (oldState: string, newState: string, season: number,
  key: string): Promise<void> => {
  if (oldState === newState) return;

  if (slackClient === undefined) slackClient = new WebClient(process.env.SLACK_API_TOKEN);
  let notificationChannel: string | undefined;

  if (process.env.SLACK_NOTIFICATION_CHANNEL) {
    notificationChannel = process.env.SLACK_NOTIFICATION_CHANNEL as string;
  } else {
    functions.logger.error("Didn't get a Slack notification channel");
    return;
  }

  const eventSnap = await admin
    .database()
    .ref(`/seasons/${season}/events/${key}`)
    .once('value');

  const event: Event = await eventSnap.val();

  if (event.name.startsWith('[DEV]')) {
    functions.logger.info('Skipping status update handler for dev event', event.name);
    return;
  }

  let statusText: string | undefined;

  if (newState === 'QualsInProgress') {
    statusText = 'has published their qualification schedule';
  } else if (newState === 'AwaitingAlliances') {
    statusText = 'has finished their qualification matches';
  } else if (newState === 'EventOver') {
    statusText = 'has completed their event';
  }

  if (statusText) {
    try {
      await slackClient.chat.postMessage({
        text: `➡️ ${event.name} ${statusText}`,
        channel: notificationChannel,
      });
    } catch (err) {
      functions.logger.error('Failed to send Slack message', err);
    }
  }
};
