import { AtMenuConfigService } from '@affine/core/modules/at-menu-config/services';
import type { LinkedWidgetConfig } from '@blocksuite/affine/widgets/linked-doc';
import { type FrameworkProvider } from '@toeverything/infra';

export function createLinkedWidgetConfig(
  framework: FrameworkProvider
): Partial<LinkedWidgetConfig> {
  try {
    const atMenuConfigService = framework.getOptional(AtMenuConfigService);
    if (atMenuConfigService) {
      return atMenuConfigService.getConfig();
    }
  } catch {}
  return {};
}
