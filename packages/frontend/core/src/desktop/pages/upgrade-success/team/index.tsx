import { Button } from '@affine/component';
import { AuthPageContainer } from '@affine/component/auth-components';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { useCompanyProfile } from '@affine/core/components/hooks/use-company-profile';
import { Trans, useI18n } from '@affine/i18n';
import { useCallback } from 'react';


import * as styles from './styles.css';

/**
 * /upgrade-success/team page
 *
 * only on web
 */
export const Component = () => {
  const t = useI18n();
  const { jumpToIndex } = useNavigateHelper();
  const { supportEmail } = useCompanyProfile();


  const openWorkspace = useCallback(() => {
    jumpToIndex();
  }, [jumpToIndex]);

  const subtitle = (
    <div className={styles.leftContentText}>
      <div>{t['com.IntoAI.payment.upgrade-success-page.team.text-1']()}</div>
      <div>
        <Trans
          i18nKey={'com.IntoAI.payment.upgrade-success-page.team.text-2'}
          components={{
            1: (
              <a
                href={`mailto:${supportEmail}`}
                className={styles.mail}
              />
            ),
          }}
        />
      </div>
    </div>
  );

  return (
    <AuthPageContainer
      title={t['com.IntoAI.payment.upgrade-success-page.title']()}
      subtitle={subtitle}
    >
      <Button variant="primary" size="extraLarge" onClick={openWorkspace}>
        {t['Visit Workspace']()}
      </Button>
    </AuthPageContainer>
  );
};
