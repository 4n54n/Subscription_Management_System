import { useI18n } from '@affine/i18n';

import { Button } from '../../ui/button';
import { AuthPageContainer } from '../auth-components';

export const ExpiredPage = ({ onOpenAffine }: { onOpenAffine: () => void }) => {
  const t = useI18n();
  return (
    <AuthPageContainer
      title={t['com.IntoAI.expired.page.title']()}
      subtitle={t['com.IntoAI.expired.page.new-subtitle']()}
    >
      <Button variant="primary" size="large" onClick={onOpenAffine}>
        {t['com.IntoAI.auth.open.IntoAI']()}
      </Button>
    </AuthPageContainer>
  );
};
