export type AppInfo = {
  version: string;
  buildType: string;
  channel: string;
  isPackaged: boolean;
  viewId?: string;
  [key: string]: any;
};

export type SharedStorage = Record<string, any>;

export type ClientHandler = Record<string, Record<string, (...args: any[]) => Promise<any>>> & Record<string, any>;

export type UIEvents = {
  onTabAction: (callback: (event: any) => void) => () => void;
  onCloseView: (callback: () => void) => () => void;
  onToggleRightSidebar: (callback: (tabId: string) => void) => () => void;
  onTabGoToRequest: (callback: (opts: { tabId: string; to: any }) => void) => () => void;
  onTabsStatusChange: (callback: (tabs: any[]) => void) => () => void;
  [key: string]: any;
};

export type ClientEvents = {
  ui: UIEvents;
  [namespace: string]: any;
};

export const appInfo = (globalThis as any).__appInfo as AppInfo | null;
export const apis = (globalThis as any).__apis as ClientHandler | undefined;
export const events = (globalThis as any).__events as ClientEvents | undefined;

export const sharedStorage = (globalThis as any).__sharedStorage as
  | SharedStorage
  | undefined;

export type SpellCheckStateSchema = {
  enabled?: boolean;
  dictionary?: string[];
};
export type SpellCheckStateKey = 'spellCheckState';
export const SpellCheckStateKey: SpellCheckStateKey = 'spellCheckState';

export type MenubarStateSchema = {
  enabled?: boolean;
};
export type MenubarStateKey = 'menubarState';
export const MenubarStateKey: MenubarStateKey = 'menubarState';

export type MeetingSettingsSchema = {
  enabled?: boolean;
  recordingSavingMode?: string;
  autoTranscription?: boolean;
  recordingMode?: string;
};
export type MeetingSettingsKey = 'meetingSettings';
export const MeetingSettingsKey: MeetingSettingsKey = 'meetingSettings';

export type TabViewsMetaSchema = any;
export type WorkbenchMeta = any;
export type WorkbenchViewMeta = any;
export type WorkbenchViewModule = any;
export type AddTabOption = any;
export type TabAction = any;
