export default {
  Sentry: {
    init: {
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    },
  },
};
