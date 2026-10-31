import { Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { UrlService } from '@affine/core/modules/url';
import { appIconMap, appNames } from '@affine/core/utils/channel';
import { useI18n } from '@affine/i18n';
import { ArrowRightSmallIcon, OpenInNewIcon } from '@blocksuite/icons/rc';
import { useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import { useCompanyProfile } from '../../../../../components/hooks/use-company-profile';
import { useAppSettingHelper } from '../../../../../components/hooks/affine/use-app-setting-helper';
import * as styles from './style.css';

export const AboutAffine = () => {
  const t = useI18n();
  const companyProfile = useCompanyProfile();
  const { appSettings, updateSettings } = useAppSettingHelper();
  const channel = BUILD_CONFIG.appBuildType;
  const appIcon = appIconMap[channel];
  const { urlService } = useServices({
    UrlService,
  });

  const websiteUrl = companyProfile.websiteUrl || 'https://www.intoai.ai';
  const supportUrl = companyProfile.contactUsUrl || (companyProfile.supportEmail ? `mailto:${companyProfile.supportEmail}` : 'https://www.intoai.ai/contact');
  const privacyUrl = companyProfile.privacyPolicyUrl || 'https://www.intoai.ai/privacy';
  const termsUrl = companyProfile.termsOfServiceUrl || 'https://www.intoai.ai/terms';

  return (
    <>
      <SettingHeader
        title="About One"
        subtitle="One workspace for all your docs, projects & AI workflows"
        data-testid="about-title"
      />
      <SettingWrapper title={t['com.IntoAI.aboutIntoAI.version.title']()}>
        <SettingRow
          name="One"
          desc={BUILD_CONFIG.appVersion}
          className={styles.appImageRow}
        >
          <img src={appIcon} alt="One" width={56} height={56} />
        </SettingRow>
        <SettingRow
          name={t['com.IntoAI.aboutIntoAI.version.editor.title']()}
          desc={BUILD_CONFIG.editorVersion}
        />
        {BUILD_CONFIG.isElectron ? (
          <>
            <SettingRow
              name={t['com.IntoAI.aboutIntoAI.changelog.title']()}
              desc={t['com.IntoAI.aboutIntoAI.changelog.description']()}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                urlService.openPopupWindow(BUILD_CONFIG.changelogUrl);
              }}
            >
              <ArrowRightSmallIcon />
            </SettingRow>
          </>
        ) : null}
      </SettingWrapper>
      <SettingWrapper title="Contact">
        <a
          className={styles.link}
          rel="noreferrer"
          href={websiteUrl}
          target="_blank"
        >
          Website
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href={supportUrl}
          target="_blank"
        >
          Support
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
      <SettingWrapper title="Legal">
        <a
          className={styles.link}
          rel="noreferrer"
          href={privacyUrl}
          target="_blank"
        >
          Privacy Policy
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href={termsUrl}
          target="_blank"
        >
          Terms of Service
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
    </>
  );
};
