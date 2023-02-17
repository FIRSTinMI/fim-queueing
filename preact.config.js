import Dotenv  from 'dotenv-webpack'
const crypto = require("crypto");

/**
 * md4 algorithm is not available anymore in NodeJS 17+ (because of lib SSL 3).
 * In that case, silently replace md4 by md5 algorithm.
 * 
 * FIXME: This is like super hacky, and once `preact-cli` is on WebPack 5, this
 *        should be removed. It might be a security risk? But I'm not incredibly
 *        concerned since none of this should be used at runtime.
 */
try {
  crypto.createHash('md4');
} catch (e) {
  console.warn('Crypto "md4" is not supported anymore by this Node version');
  const origCreateHash = crypto.createHash;
  crypto.createHash = (alg, opts) => {
    return origCreateHash(alg === 'md4' ? 'md5' : alg, opts);
  };
}

/**
 * @param {import('preact-cli').Config} config - Original webpack config
 * @param {import('preact-cli').Env} env - Current environment info
 * @param {import('preact-cli').Helpers} helpers - Object with useful helpers for working with the webpack config
 */
export default (config, env, helpers) => { 
    config.plugins.push(new Dotenv({path: "./.env", systemvars: true}));

    if (env.isProd) {
      config.devtool = false;
      config.mode = "production";
    }
 }