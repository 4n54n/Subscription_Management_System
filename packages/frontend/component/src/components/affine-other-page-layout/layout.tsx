import { Button } from '@affine/component/ui/button';
import { useTheme } from 'next-themes';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import dotBgDark from './assets/dot-bg.dark.png';
import dotBgLight from './assets/dot-bg.light.png';
import { DesktopNavbar } from './desktop-navbar';
import * as styles from './index.css';
import { MobileNavbar } from './mobile-navbar';

import logoImg from './assets/logo.png';

export const AffineOtherPageLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
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

  const { resolvedTheme } = useTheme();
  const backgroundImage =
    resolvedTheme === 'dark' && dotBgDark ? dotBgDark : dotBgLight;

  return (
    <div
      className={styles.root}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {BUILD_CONFIG.isElectron ? (
        <div className={styles.draggableHeader} />
      ) : (
        <div className={styles.topNav}>
          <a href="/" rel="noreferrer" className={styles.affineLogo}>
            <img src={logoImg} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block' }} />
          </a>

          <DesktopNavbar />
          <Button
            onClick={openWebsiteLink}
            className={styles.hideInSmallScreen}
          >
            Visit Website
          </Button>
          <MobileNavbar />
        </div>
      )}

      {children}
    </div>
  );
};
