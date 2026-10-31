import type { OverridedMixpanel } from 'mixpanel-browser';

// BrightLoop Workspace: Mixpanel telemetry tracking is fully disabled
export const mixpanel: OverridedMixpanel = new Proxy(
  function () {} as unknown as OverridedMixpanel,
  {
    get(_target, _prop) {
      if (_prop === 'people') {
         return new Proxy({}, { get: () => () => {} });
      }
      return () => {};
    },
    apply() {},
  }
) as OverridedMixpanel;
