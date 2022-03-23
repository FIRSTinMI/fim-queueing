import Dotenv  from 'dotenv-webpack'
export default (config, env, helpers) => { 
    config.plugins.push(new Dotenv({path: "./.env", systemvars: true}));
 }