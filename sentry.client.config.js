export default {
  Sentry: {
    init: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    },
  },
};
