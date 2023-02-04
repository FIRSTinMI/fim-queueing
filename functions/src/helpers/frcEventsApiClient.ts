const functions = require("firebase-functions");
const fetch = require("node-fetch");

let authHeaderValue: string;
let baseUrl: string;

/**
 * One-time initialization of the API client
 * @param {string} apiKey frc.events API key, not base64 encoded
 * @param {string} apiBaseUrl Base URL for the frc.events API, defaults to
 *                            "https://frc-api.firstinspires.org/v3.0"
 */
const initializeFrcEventsClient =
  (apiKey: string, apiBaseUrl: string = "https://frc-api.firstinspires.org/v3.0")
  : void => {
    if (apiKey === null || apiKey === "") {
      throw new Error("frc.events API key is required");
    }

    authHeaderValue = `Basic ${Buffer.from(apiKey).toString("base64")}`;
    baseUrl = apiBaseUrl;
  };

/**
 * Make a GET call to an frc.events API endpoint. Will throw on non-200
 * responses. Will return response with JSON already parsed
 * @param {string} endpoint Which API endpoint to hit, begin with a '/'
 * @return {Promise<object>} Parsed JSON response
 */
const get = async (endpoint: string): Promise<object> => {
  if (!endpoint.startsWith("/")) {
    throw new Error("endpoint must be relative and start with a '/'");
  }
  const startTime = performance.now();
  const fetchResult = await fetch(`${baseUrl}${endpoint}`,
      {
        headers: {
          "Authorization": authHeaderValue,
          "Content-Type": "application/json",
        },
      }
  );
  if (!fetchResult.ok) throw new Error(fetchResult.statusText);

  const json = await fetchResult.json();

  const duration = performance.now() - startTime;
  functions.logger.debug(`Fetch to '${endpoint} took ${duration}ms'`);

  return json;
};

export {initializeFrcEventsClient, get};
