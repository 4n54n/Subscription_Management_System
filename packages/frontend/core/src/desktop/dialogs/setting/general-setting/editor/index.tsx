import { SettingHeader } from '@affine/component/setting-components';
import { useI18n } from '@affine/i18n';

import { Edgeless } from './edgeless';
import { General } from './general';
import { Page } from './page';

export const EditorSettings = () => {
  const t = useI18n();

  return (
    <>
      <SettingHeader
        title={t['com.IntoAI.settings.editorSettings.title']()}
        subtitle={t['com.IntoAI.settings.editorSettings.subtitle']()}
      />
      <General />
      <Page />
      <Edgeless />

      {/* // TODO(@EYHN): implement export and import
       <Preferences /> */}
    </>
  );
};
