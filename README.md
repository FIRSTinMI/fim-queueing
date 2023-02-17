# fim-queueing

## About this project

This project is intended for use in FIRST in Michigan field setups. Other usages are not supported, though may work with some changes. No connection to the AV server or field is required, only an internet connection. Any number of computers at a given event can be connected.

The main goals of this project are as follows:

1. A rewrite of the queueing display which uses more modern technologies and is easier to maintain.
2. Proper version control, rather than making changes on one box and copy-pasting it to the others. This includes a robust CI/CD pipeline for quick changes to the app.
3. The least amount of bytes over the wire as possible. Local processing power is plentiful, a stable network connection is not a guarantee.

# Documentation

- [User Documentation](docs/user-info.md)
- [Administrative Documentation](docs/admin-info.md)

## Breakdown

### Web app

This Preact app is the main way that the queueing system interacts with the world. It creates a WebSocket connection to Firebase and, after login, gets notified of any changes to the event or matches. The mode can be switched away from "automatic" to "assisted" if the current match needs to be manually controlled.

### Firebase Functions

The application is backed by a function which runs every minute. This function looks for and generates match schedules for events, and watches match results to determine the current match on the field. Thanks to Realtime Database, any changes made by this function immediately become visible to any clients logged in to a given event.

## Assumptions

In order for an event to be compatible with fim-queueing, all of the following must be true:

1. The event is not being run offline, and has a stable internet connection
2. The venue does not block connections to/from Firebase (or Google Cloud)
3. The FMS is sending data to FIRST HQ, and FIRST HQ is including that data in their API
4. (To use the playoff displays) The event is running playoffs using the late-2022 iteration of FRC double elimination

## Telemetry and Remote Administration

Note: To allow for technical support, the queueing display "phones home" to an administration server by default. If this connection fails the display will still work without issue. This connection remains open indefinitely and shares the following data in real time:

- The event code
- A connection ID (unique to the browser tab)
- An installation ID (unique to the computer)
- What page the app is on

And has the following capabilities:

- Remotely trigger a full reload of the page
- Remotely go to a different page within the app
- Remotely display the connection ID to assist in finding which computer is which