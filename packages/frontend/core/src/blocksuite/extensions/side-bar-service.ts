import { WorkbenchService } from '@affine/core/modules/workbench';
import { SidebarExtension } from '@blocksuite/affine/shared/services';
import type { FrameworkProvider } from '@toeverything/infra';

export function patchSideBarService(framework: FrameworkProvider) {
  const workbench = framework.getOptional(WorkbenchService)?.workbench;

  return SidebarExtension({
    open: (tabId?: string) => {
      workbench?.openSidebar();
      workbench?.activeView$.value.activeSidebarTab(tabId ?? null);
    },
    close: () => {
      workbench?.closeSidebar();
    },
    getTabIds: () => {
      return workbench
        ? workbench.activeView$.value.sidebarTabs$.value.map(tab => tab.id)
        : [];
    },
  });
}
