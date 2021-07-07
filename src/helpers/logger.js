import * as util from 'util';

/**
 * Logs the event
 */
const log = (level, ...args) => {
  // eslint-disable-next-line prefer-spread,no-console
  console[level](util.format.apply(util, args));
};

export const debug = (...args) => log('debug', ...args);

export const info = (...args) => log('log', ...args);

export const error = (...args) => log('error', ...args);
