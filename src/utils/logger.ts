type LogArgs = unknown[];

const noop = (..._args: LogArgs) => {};

const devLog =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? (...args: LogArgs) => console.log(...args)
    : noop;

export const logger = {
  debug: devLog,
  info: devLog,
  warn: (...args: LogArgs) => console.warn(...args),
  error: (...args: LogArgs) => console.error(...args),
};

export default logger;
