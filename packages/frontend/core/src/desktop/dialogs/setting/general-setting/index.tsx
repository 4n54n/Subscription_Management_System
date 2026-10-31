import { UserFeatureService } from '@affine/core/modules/cloud/services/user-feature';
import type { SettingTab } from '@affine/core/modules/dialogs/constant';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useI18n } from '@affine/i18n';
import {
  AppearanceIcon,

  ExperimentIcon,
  FolderIcon,
  InformationIcon,
  KeyboardIcon,
  MeetingIcon,
  NotificationIcon,
  PenIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useEffect } from 'react';

import { AuthService } from '../../../../modules/cloud';
import type { SettingSidebarItem } from '../types';
import { AboutAffine } from './about';
import { AppearanceSettings } from './appearance';
import { BackupSettingPanel } from './backup';
import { EditorSettings } from './editor';
import { ExperimentalFeatures } from './experimental-features';
import { MeetingsSettings } from './meetings';
import { NotificationSettings } from './notifications';

import { Shortcuts } from './shortcuts';

export type GeneralSettingList = SettingSidebarItem[];

export const useGeneralSettingList = (): GeneralSettingList => {
  const t = useI18n();
  const { authService, userFeatureService, featureFlagService } =
    useServices({
      AuthService,
      UserFeatureService,
      FeatureFlagService,
    });
  const status = useLiveData(authService.session.status$);
  const loggedIn = status === 'authenticated';
  const enableEditorSettings = useLiveData(
    featureFlagService.flags.enable_editor_settings.$
  );
  const enableMeetings = useLiveData(
    featureFlagService.flags.enable_meetings.$
  );

  useEffect(() => {
    userFeatureService.userFeature.revalidate();
  }, [userFeatureService]);

  const settings: GeneralSettingList = [
    {
      key: 'appearance',
      title: t['com.IntoAI.settings.appearance'](),
      icon: <AppearanceIcon />,
      testId: 'appearance-panel-trigger',
    },
    {
      key: 'shortcuts',
      title: t['com.IntoAI.keyboardShortcuts.title'](),
      icon: <KeyboardIcon />,
      testId: 'shortcuts-panel-trigger',
    },

  ];
  if (loggedIn) {
    settings.push({
      key: 'notifications',
      title: t['com.IntoAI.setting.notifications'](),
      icon: <NotificationIcon />,
      testId: 'notifications-panel-trigger',
    });
  }
  if (enableEditorSettings) {
    // add editor settings to second position
    settings.splice(1, 0, {
      key: 'editor',
      title: t['com.IntoAI.settings.editorSettings'](),
      icon: <PenIcon />,
      testId: 'editor-panel-trigger',
    });
  }

  if (enableMeetings) {
    settings.push({
      key: 'meetings',
      title: t['com.IntoAI.settings.meetings'](),
      icon: <MeetingIcon />,
      testId: 'meetings-panel-trigger',
    });
  }

  if (BUILD_CONFIG.isElectron) {
    settings.push({
      key: 'backup',
      title: t['com.IntoAI.settings.workspace.backup'](),
      icon: <FolderIcon />,
      testId: 'backup-panel-trigger',
    });
  }

  settings.push(
    {
      key: 'experimental-features',
      title: t['com.IntoAI.settings.workspace.experimental-features'](),
      icon: <ExperimentIcon />,
      testId: 'experimental-features-trigger',
    },
    {
      key: 'about',
      title: 'About One',
      icon: <InformationIcon />,
      testId: 'about-panel-trigger',
    }
  );

  return settings;
};

interface GeneralSettingProps {
  activeTab: SettingTab;
}

export const GeneralSetting = ({
  activeTab,
}: GeneralSettingProps) => {
  switch (activeTab) {
    case 'shortcuts':
      return <Shortcuts />;
    case 'notifications':
      return <NotificationSettings />;
    case 'editor':
      return <EditorSettings />;
    case 'appearance':
      return <AppearanceSettings />;
    case 'meetings':
      return <MeetingsSettings />;
    case 'about':
      return <AboutAffine />;

    case 'experimental-features':
      return <ExperimentalFeatures />;
    case 'backup':
      return <BackupSettingPanel />;
    default:
      return null;
  }
};
