function createSentry() {
  const wrapped = {
    init() {},
    enable() {},
    disable() {},
  };
  return wrapped;
}

export const sentry = createSentry();
