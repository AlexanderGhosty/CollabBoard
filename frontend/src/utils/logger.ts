/* eslint-disable no-console */

const isDevelopment = import.meta.env.DEV

const createConditionalLogger = <T extends (...args: never[]) => void>(
  loggerFn: T,
) => {
  if (!isDevelopment) {
    return () => {
      /* noop in production */
    }
  }

  return (...args: Parameters<T>) => {
    loggerFn(...args)
  }
}

export const logger = {
  debug: createConditionalLogger(console.log),
  info: createConditionalLogger(console.info),
  warn: createConditionalLogger(console.warn),
  error: (...args: Parameters<typeof console.error>) => {
    console.error(...args)
  },
}

export type Logger = typeof logger
