export type ApiSchedule = {
  "Schedule": {
    "field": string;
    "tournamentLevel": string;
    "description": string;
    "startTime": string;
    "matchNumber": number;
    "teams": {
      "teamNumber": number;
      "station": string;
      "surrogate": boolean;
    }[]
  }[]
}
  
export type ApiAvatars = {
  "teams": {
    "teamNumber": number;
    "encodedAvatar": string
    }[];
  "teamCountTotal": number,
  "teamCountPage": number,
  "pageCurrent": number,
  "pageTotal": number
}
  
export type ApiMatchResults = {
  "Matches": {
    "actualStartTime": string;
    "tournamentLevel": string;
    "postResultTime": string;
    "description": string;
    "matchNumber": number;
    "scoreRedFinal": number;
    "scoreRedFoul": number;
    "scoreRedAuto": number;
    "scoreBlueFinal": number;
    "scoreBlueFoul": number;
    "scoreBlueAuto": number;
    "teams": {
        "teamNumber": number;
        "station": string;
        "dq": boolean;
      }[],
    }[];
  }