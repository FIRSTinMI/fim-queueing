const functions = require("firebase-functions");
const fetch = require("node-fetch");
// const NodeCache = require("node-cache");

// TODO: Idk if this is actually a good idea, it may have RAM implications.
// It's possible that in the firebase runtime the cleanup will never run and
// entries in the cache will grow infinitely, slowly setting my wallet on fire.
// const cache = new NodeCache({
//   stdTTL: 3600,
// });

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

// /**
//  * A custom error thrown if data has not changed.
//  */
// class NotChangedError extends Error {
//   /**
//    * Generic constructor
//    */
//   constructor() {
//     super("The content has not changed. This has been thrown because" +
//     "`useCache` was set to true. The code should be doing something with" +
//     "this exception.");
//   }
// }

/**
 * Make a GET call to an frc.events API endpoint. Will throw on non-200
 * responses. Will return response with JSON already parsed
 * @param {string} endpoint Which API endpoint to hit, begin with a '/'
 * @param {string | undefined} eventCode key to use to set context
 * @param {boolean} useCache If `true`, throw a {@link NotChangedError} if the
 * content has not been modified. Default `false`.
 * @return {Promise<object>} Parsed JSON response
 */
const get = async (endpoint: string, eventCode: string | undefined = undefined
    /* , useCache: boolean = false */)
    : Promise<object> => {
  if (!endpoint.startsWith("/")) {
    throw new Error("endpoint must be relative and start with a '/'");
  }
  const startTime = performance.now();
  const headers: any = {
    "Authorization": authHeaderValue,
    "Content-Type": "application/json",
  };
  // if (useCache) {
  //   const lastModified = cache.get(endpoint);
  //   // Lol the FRC API doesn't respect this header despite the docs making
  //   // a big deal about how you should definitely do this.
  //   if (lastModified !== undefined) {
  //     functions.logger.info("Using cached value for ", endpoint,
  //         lastModified);
  //     headers["If-Modified-Since"] = lastModified;
  //   }
  // }

  const fetchResult = await fetch(`${baseUrl}${endpoint}`,
      {
        headers: headers,
      }
  );
  // if (fetchResult.status === 302) throw new NotChangedError();
  if (!fetchResult.ok) throw new Error(fetchResult.statusText);

  // Since the API doesn't seem to respect the headers we'll do it ourselves
  const lastModified = fetchResult.headers.get("Last-Modified");
  if (lastModified && eventCode) {
    const lastModifiedMs = Date.parse(lastModified);
    let ctx = context[eventCode];
    if (!ctx) ctx = defaultContext;
    if (ctx.lastModifiedMs && ctx.lastModifiedMs < lastModifiedMs) {
      ctx.lastModifiedMs = lastModifiedMs;
    }
  }

  // if (lastModified) {
  //   functions.logger.info("Setting cache for", endpoint, "to",
  //       lastModified);
  //   const lastModifiedMs = Date.parse(lastModified);
  //   if (Date.parse(cache.get(endpoint)) &&
  //       lastModifiedMs <= cache.get(endpoint)) {
  //     // The data we got is equal or sooner than what we have, so stop
  //     throw new NotChangedError();
  //   }
  //   cache.set(endpoint, lastModified);
  // }

  const json = await fetchResult.json();

  const duration = performance.now() - startTime;
  functions.logger.debug(`Fetch to '${endpoint} took ${duration}ms'`);

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
  initializeFrcEventsClient, get /* , NotChangedError */, getContext,
  clearContext,
};
