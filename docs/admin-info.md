# FiM Queueing: Administrative Documentation

## Initialize a season

Use the init_event.py script to add all events for a given season and district. If any events are added later, the script can be re-run and it will only add events which are not already in the database.

## Re-generate event schedule

Go into the Firebase Realtime Database console, find the event by key, and set hasQualSchedule to false. The next time the job runs it will pull the schedule from the FRC API.

## Re-generate team avatar

Go into the Firebase Realtime Database console, find the avatar by team number, and delete it. Next time a schedule generation which includes that team is performed, the avatar will be re-created.