import { cssVarV2 } from '@toeverything/theme/v2';

import { useServerConfig } from '../common';

export const ServerVersion = () => {
  const serverConfig = useServerConfig();
  const version = serverConfig?.version;

  return (
    <div
      className="inline-flex items-center justify-between pt-2 border-t px-2 text-xs flex-nowrap gap-1"
      style={{
        color: cssVarV2('text/tertiary'),
      }}
    >
      <span>Server Version</span>
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        title={version}
      >
        {`v${version}`}
      </span>
    </div>
  );
};
