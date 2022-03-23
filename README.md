# fim-queueing

## About this project

This project is intended for use in FIRST in Michigan field setups, running on the offical A/V server. Other usages are not supported, though may work with some changes. This expects a direct connection with the FMS server or a connection with the field network via a proxy.

The main goals of this project are as follows:

1. A rewrite of the queueing display which uses more modern technologies and is easier to maintain.
2. Proper version control, rather than making changes on one box and copy-pasting it to the others.
3. The least amount of bytes over the wire as possible. Local processing power is plentiful, a stable network connection is not a guarantee.


## Breakdown

### Web app

This Preact app is the main way that the queueing system interacts with the world. It will pull match and team data on the initial load, and occasionally poll for changes to the current match. A sample nginx config is provided which directs schedule-related requests to one directory and everything else to where the webapp lives, allowing PUT requests to the current match to support real(-ish) time updating.

### Schedule generation

This set of Python scripts allows for pulling all necessary event data from the FRC Events API. It should be run at the beginning of the event after the qualification schedule has been generated and posted. This is not currently completed and will be coming to the repo soon.

## CLI Commands
*   `npm install`: Installs dependencies
*   `npm run dev`: Run a development, HMR server
*   `npm run serve`: Run a production-like server
*   `npm run build`: Production-ready build
*   `npm run lint`: Pass TypeScript files using ESLint
