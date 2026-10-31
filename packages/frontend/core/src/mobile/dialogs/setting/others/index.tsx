import { useI18n } from '@affine/i18n';

import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';

export const OthersGroup = () => {
  const t = useI18n();

  return (
    <SettingGroup title={t['com.IntoAI.mobile.setting.others.title']()}>
      <RowLayout
        label={t['com.IntoAI.mobile.setting.others.website']()}
        href="https://intoai.ai/"
      />

      <RowLayout
        label={t['com.IntoAI.mobile.setting.others.privacy']()}
        href="https://intoai.ai/privacy"
      />

      <RowLayout
        label={t['com.IntoAI.mobile.setting.others.terms']()}
        href="https://intoai.ai/terms"
      />
    </SettingGroup>
  );
};
