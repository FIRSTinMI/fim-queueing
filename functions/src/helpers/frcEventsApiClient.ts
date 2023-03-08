const functions = require("firebase-functions");
const fetch = require("node-fetch");

let authHeaderValue: string;
let baseUrl: string;

type Context = {
  lastModifiedMs: number | null,
}
const defaultContext: Context = {
  /**
   * The most recent timestamp for a given event that we know of. Used to report
   * on data staleness.
   */
  lastModifiedMs: null,
};

/**
 * @static
 */
const context: {
  [eventCode: string]: Context} = {};

/**
 * One-time initialization of the API client
 * @param {string} apiKey frc.events API key, not base64 encoded
 * @param {string} apiBaseUrl Base URL for the frc.events API, defaults to
 *                            "https://frc-api.firstinspires.org/v3.0"
 */
const initializeFrcEventsClient =
  (apiKey: string, apiBaseUrl: string = "https://frc-api.firstinspires.org/v3.0")
  : void => {
    // We've already initialized, bail out
    if (authHeaderValue) return;

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
 * @param {string | undefined} eventCode key to use to set context
 * @return {Promise<object>} Parsed JSON response
 */
const get = async (endpoint: string, eventCode: string | undefined = undefined)
    : Promise<object> => {
  if (!endpoint.startsWith("/")) {
    throw new Error("endpoint must be relative and start with a '/'");
  }
  const startTime = performance.now();
  const headers: any = {
    "Authorization": authHeaderValue,
    "Content-Type": "application/json",
  };

  const fetchResult = await fetch(`${baseUrl}${endpoint}`,
      {
        headers: headers,
      }
  );
  if (!fetchResult.ok) throw new Error(fetchResult.statusText);

  const lastModified = fetchResult.headers.get("Last-Modified");
  if (lastModified && eventCode) {
    const lastModifiedMs = Date.parse(lastModified);
    let ctx = context[eventCode];
    if (!ctx) ctx = defaultContext;
    if (!ctx.lastModifiedMs || ctx.lastModifiedMs < lastModifiedMs) {
      ctx.lastModifiedMs = lastModifiedMs;
    }
  }

  const json = await fetchResult.json();

  const duration = performance.now() - startTime;
  functions.logger.debug(`Fetch to '${endpoint}' took ${duration}ms`);

  return json;
};

const getContext = (eventCode: string) => {
  if (eventCode in context) {
    return context[eventCode];
  }
  return defaultContext;
};

const clearContext = (eventCode: string,
    newContext: Context = defaultContext) => {
  context[eventCode] = newContext;
};

export {
  initializeFrcEventsClient, get, getContext,
  clearContext,
};
