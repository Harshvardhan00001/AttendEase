const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (...args: unknown[]) => {
    console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (!isProd) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
