import { Button } from '@affine/component/ui/button';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { appIconMap, appNames } from '@affine/core/utils/channel';
import { Trans, useI18n } from '@affine/i18n';
import { LocalWorkspaceIcon, Logo1Icon } from '@blocksuite/icons/rc';
import { useServiceOptional } from '@toeverything/infra';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { getOpenUrlInDesktopAppLink } from '../utils';
import * as styles from './open-in-app-page.css';

let lastOpened = '';

interface OpenAppProps {
  urlToOpen?: string | null;
  openHereClicked?: (e: MouseEvent) => void;
  mode?: 'auth' | 'open-doc'; // default to 'auth'
}
const channel = BUILD_CONFIG.appBuildType;
const url =
  'https://intoai.ai/download' + (channel !== 'stable' ? '/beta-canary' : '');

export const OpenInAppPage = ({
  urlToOpen,
  openHereClicked,
  mode = 'auth',
}: OpenAppProps) => {
  // default to open the current page in desktop app
  urlToOpen ??= getOpenUrlInDesktopAppLink(window.location.href, true);
  const workspaceDialogService = useServiceOptional(WorkspaceDialogService);
  const t = useI18n();

  const [websiteUrl, setWebsiteUrl] = useState('https://www.intoai.ai');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_company_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.websiteUrl) setWebsiteUrl(parsed.websiteUrl);
      }
      fetch('/api/admin/company')
        .then(res => res.json())
        .then(data => {
          if (data && data.websiteUrl) setWebsiteUrl(data.websiteUrl);
        })
        .catch(() => {});
    } catch (_) {}
  }, []);

  const openWebsiteLink = useCallback(() => {
    open(websiteUrl, '_blank');
  }, [websiteUrl]);

  const appIcon = appIconMap[channel];
  const appName = appNames[channel];

  const goToAppearanceSetting = useCallback(
    (e: MouseEvent) => {
      openHereClicked?.(e);
      workspaceDialogService?.open('setting', {
        activeTab: 'appearance',
      });
    },
    [workspaceDialogService, openHereClicked]
  );

  if (urlToOpen && lastOpened !== urlToOpen) {
    lastOpened = urlToOpen;
    location.href = urlToOpen;
  }

  if (!urlToOpen) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.topNav}>
        <a href="/" rel="noreferrer" className={styles.affineLogo}>
          <Logo1Icon width={24} height={24} />
        </a>

        <div className={styles.topNavLinks}>
          <a
            href="https://intoai.ai"
            target="_blank"
            rel="noreferrer"
            className={styles.topNavLink}
          >
            Official Website
          </a>
          <a
            href="https://intoai.ai/blog"
            target="_blank"
            rel="noreferrer"
            className={styles.topNavLink}
          >
            Blog
          </a>
          <a
            href="https://intoai.ai/about-us"
            target="_blank"
            rel="noreferrer"
            className={styles.topNavLink}
          >
            Contact us
          </a>
        </div>

        <Button onClick={openWebsiteLink}>
          Visit Website
        </Button>
      </div>

      <div className={styles.centerContent}>
        <img src={appIcon} alt={appName} width={120} height={120} />

        <div className={styles.prompt}>
          {mode === 'open-doc' ? (
            <Trans i18nKey="com.IntoAI.auth.open.IntoAI.open-doc-prompt">
              This doc is now opened in {appName}
            </Trans>
          ) : (
            <Trans i18nKey="com.IntoAI.auth.open.intoai.aimpt">
              Open {appName} app now
            </Trans>
          )}
        </div>

        <div className={styles.promptLinks}>
          {openHereClicked && (
            <a
              className={styles.promptLink}
              onClick={openHereClicked}
              target="_blank"
              rel="noreferrer"
            >
              {t['com.IntoAI.auth.open.IntoAI.doc.open-here']()}
            </a>
          )}
          <a
            className={styles.promptLink}
            href={urlToOpen}
            target="_blank"
            rel="noreferrer"
          >
            {t['com.IntoAI.auth.open.IntoAI.try-again']()}
          </a>
        </div>
      </div>

      {mode === 'open-doc' ? (
        <div className={styles.docFooter}>
          <button
            className={styles.editSettingsLink}
            onClick={goToAppearanceSetting}
          >
            {t['com.IntoAI.auth.open.IntoAI.doc.edit-settings']()}
          </button>

          <div className={styles.docFooterText}>
            <LocalWorkspaceIcon width={16} height={16} />
            {t['com.IntoAI.auth.open.IntoAI.doc.footer-text']()}
          </div>
        </div>
      ) : null}
    </div>
  );
};
