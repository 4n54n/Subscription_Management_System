import { useI18n } from '@affine/i18n';

import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';

export const AboutGroup = () => {
  const t = useI18n();

  return (
    <SettingGroup title={t['com.IntoAI.mobile.setting.about.title']()}>
      <RowLayout label={t['com.IntoAI.mobile.setting.about.appVersion']()}>
        {BUILD_CONFIG.appVersion}
      </RowLayout>

      <RowLayout label={t['com.IntoAI.mobile.setting.about.editorVersion']()}>
        {BUILD_CONFIG.editorVersion}
      </RowLayout>
    </SettingGroup>
  );
};
