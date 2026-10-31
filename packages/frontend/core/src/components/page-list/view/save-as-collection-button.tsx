import { Button, usePromptModal } from '@affine/component';
import type { Collection } from '@affine/env/filter';
import { useI18n } from '@affine/i18n';
import { SaveIcon } from '@blocksuite/icons/rc';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';

import { createEmptyCollection } from '../use-collection-manager';
import * as styles from './save-as-collection-button.css';

interface SaveAsCollectionButtonProps {
  onConfirm: (collection: Collection) => void;
}

export const SaveAsCollectionButton = ({
  onConfirm,
}: SaveAsCollectionButtonProps) => {
  const t = useI18n();
  const { openPromptModal } = usePromptModal();
  const handleClick = useCallback(() => {
    openPromptModal({
      title: t['com.IntoAI.editCollection.saveCollection'](),
      label: t['com.IntoAI.editCollectionName.name'](),
      inputOptions: {
        placeholder: t['com.IntoAI.editCollectionName.name.placeholder'](),
      },
      children: (
        <div className={styles.createTips}>
          {t['com.IntoAI.editCollectionName.createTips']()}
        </div>
      ),
      confirmText: t['com.IntoAI.editCollection.save'](),
      cancelText: t['com.IntoAI.editCollection.button.cancel'](),
      confirmButtonOptions: {
        variant: 'primary',
      },
      onConfirm(name) {
        onConfirm(createEmptyCollection(nanoid(), { name }));
      },
    });
  }, [openPromptModal, t, onConfirm]);
  return (
    <Button
      onClick={handleClick}
      data-testid="save-as-collection"
      prefix={<SaveIcon />}
      className={styles.button}
    >
      {t['com.IntoAI.editCollection.saveCollection']()}
    </Button>
  );
};
