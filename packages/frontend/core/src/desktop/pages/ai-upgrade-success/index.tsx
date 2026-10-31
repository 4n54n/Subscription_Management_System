import { Button } from '@affine/component';
import { AuthPageContainer } from '@affine/component/auth-components';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { useCompanyProfile } from '@affine/core/components/hooks/use-company-profile';
import { Trans, useI18n } from '@affine/i18n';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import * as styles from './styles.css';

/**
 * /ai-upgrade-success page
 *
 * only on web
 */
export const Component = () => {
  const t = useI18n();
  const [params] = useSearchParams();
  const { supportEmail } = useCompanyProfile();


  const { jumpToIndex, jumpToOpenInApp } = useNavigateHelper();
  const openAFFiNE = useCallback(() => {
    if (params.get('client')) {
      return jumpToOpenInApp('bring-to-front');
    } else {
      jumpToIndex();
    }
  }, [jumpToIndex, jumpToOpenInApp, params]);

  const subtitle = (
    <div className={styles.leftContentText}>
      {t['com.IntoAI.payment.ai-upgrade-success-page.text']()}
      <div>
        <Trans
          i18nKey={'com.IntoAI.payment.upgrade-success-page.support'}
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
      title={t['com.IntoAI.payment.ai-upgrade-success-page.title']()}
      subtitle={subtitle}
    >
      <Button variant="primary" size="extraLarge" onClick={openAFFiNE}>
        {t['com.IntoAI.other-page.nav.open-IntoAI']()}
      </Button>
    </AuthPageContainer>
  );
};
