import type { RadioItem } from '@affine/component';
import { RadioGroup, Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { LanguageMenu } from '@affine/core/components/affine/language-menu';
import { TraySettingService } from '@affine/core/modules/editor-setting/services/tray-settings';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import { useCallback, useMemo } from 'react';

import { useAppSettingHelper } from '../../../../../components/hooks/affine/use-app-setting-helper';
import { OpenInAppLinksMenu } from './links';
import { settingWrapper } from './style.css';
import { ThemeEditorSetting } from './theme-editor-setting';

export const getThemeOptions = (t: ReturnType<typeof useI18n>) =>
  [
    {
      value: 'system',
      label: t['com.IntoAI.themeSettings.system'](),
      testId: 'system-theme-trigger',
    },
    {
      value: 'light',
      label: t['com.IntoAI.themeSettings.light'](),
      testId: 'light-theme-trigger',
    },
    {
      value: 'dark',
      label: t['com.IntoAI.themeSettings.dark'](),
      testId: 'dark-theme-trigger',
    },
  ] satisfies RadioItem[];

export const ThemeSettings = () => {
  const t = useI18n();
  const { setTheme, theme } = useTheme();

  const radioItems = useMemo<RadioItem[]>(() => getThemeOptions(t), [t]);

  return (
    <RadioGroup
      items={radioItems}
      value={theme}
      width={250}
      className={settingWrapper}
      onChange={useCallback(
        (value: string) => {
          setTheme(value);
        },
        [setTheme]
      )}
    />
  );
};

const MenubarSetting = () => {
  const t = useI18n();
  const traySettingService = useService(TraySettingService);
  const { enabled } = useLiveData(traySettingService.setting$);
  return (
    <SettingWrapper
      id="menubar"
      title={t['com.IntoAI.appearanceSettings.menubar.title']()}
    >
      <SettingRow
        name={t['com.IntoAI.appearanceSettings.menubar.toggle']()}
        desc={t['com.IntoAI.appearanceSettings.menubar.description']()}
      >
        <Switch
          checked={enabled}
          onChange={checked => traySettingService.setEnabled(checked)}
        />
      </SettingRow>
    </SettingWrapper>
  );
};

export const AppearanceSettings = () => {
  const t = useI18n();

  const featureFlagService = useService(FeatureFlagService);
  const enableThemeEditor = useLiveData(
    featureFlagService.flags.enable_theme_editor.$
  );
  const { appSettings, updateSettings } = useAppSettingHelper();

  return (
    <>
      <SettingHeader
        title={t['com.IntoAI.appearanceSettings.title']()}
        subtitle={t['com.IntoAI.appearanceSettings.subtitle']()}
      />

      <SettingWrapper title={t['com.IntoAI.appearanceSettings.theme.title']()}>
        <SettingRow
          name={t['com.IntoAI.appearanceSettings.color.title']()}
          desc={t['com.IntoAI.appearanceSettings.color.description']()}
        >
          <ThemeSettings />
        </SettingRow>
        <SettingRow
          name={t['com.IntoAI.appearanceSettings.language.title']()}
          desc={t['com.IntoAI.appearanceSettings.language.description']()}
        >
          <div className={settingWrapper}>
            <LanguageMenu />
          </div>
        </SettingRow>
        {BUILD_CONFIG.isElectron ? (
          <SettingRow
            name={t['com.IntoAI.appearanceSettings.clientBorder.title']()}
            desc={t['com.IntoAI.appearanceSettings.clientBorder.description']()}
            data-testid="client-border-style-trigger"
          >
            <Switch
              checked={appSettings.clientBorder}
              onChange={checked => updateSettings('clientBorder', checked)}
            />
          </SettingRow>
        ) : null}
        {enableThemeEditor ? <ThemeEditorSetting /> : null}
      </SettingWrapper>

      {BUILD_CONFIG.isWeb && !environment.isMobile ? (
        <SettingWrapper title={t['com.IntoAI.setting.appearance.links']()}>
          <SettingRow
            name={t['com.IntoAI.setting.appearance.open-in-app']()}
            desc={t['com.IntoAI.setting.appearance.open-in-app.hint']()}
            data-testid="open-in-app-links-trigger"
          >
            <OpenInAppLinksMenu />
          </SettingRow>
        </SettingWrapper>
      ) : null}

      {BUILD_CONFIG.isElectron ? (
        <SettingWrapper
          title={t['com.IntoAI.appearanceSettings.sidebar.title']()}
        >
          <SettingRow
            name={t['com.IntoAI.appearanceSettings.noisyBackground.title']()}
            desc={t[
              'com.IntoAI.appearanceSettings.noisyBackground.description'
            ]()}
          >
            <Switch
              checked={appSettings.enableNoisyBackground}
              onChange={checked =>
                updateSettings('enableNoisyBackground', checked)
              }
            />
          </SettingRow>
          {environment.isMacOs && (
            <SettingRow
              name={t['com.IntoAI.appearanceSettings.translucentUI.title']()}
              desc={t[
                'com.IntoAI.appearanceSettings.translucentUI.description'
              ]()}
            >
              <Switch
                checked={appSettings.enableBlurBackground}
                onChange={checked =>
                  updateSettings('enableBlurBackground', checked)
                }
              />
            </SettingRow>
          )}
        </SettingWrapper>
      ) : null}

      {BUILD_CONFIG.isElectron ? <MenubarSetting /> : null}
    </>
  );
};
