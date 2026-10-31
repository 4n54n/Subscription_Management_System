import { Button, FlexWrapper, notify } from '@affine/component';
import { SubscriptionService } from '@affine/core/modules/cloud';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { EditorService } from '@affine/core/modules/editor';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AiIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import Lottie from 'lottie-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { toggleEdgelessAIOnboarding } from './apis';
import * as styles from './edgeless.dialog.css';
import mouseTrackDark from './lottie/edgeless/mouse-track-dark.json';
import mouseTrackLight from './lottie/edgeless/mouse-track-light.json';
import {
  edgelessNotifyId$,
  localNotifyId$,
  showAIOnboardingGeneral$,
} from './state';

const EdgelessOnboardingAnimation = () => {
  const { resolvedTheme } = useTheme();

  const data = useMemo(() => {
    return resolvedTheme === 'dark' ? mouseTrackDark : mouseTrackLight;
  }, [resolvedTheme]);

  return (
    <div className={styles.thumb}>
      <Lottie
        loop
        autoplay
        animationData={data}
        className={styles.thumbContent}
      />
    </div>
  );
};

export const AIOnboardingEdgeless = () => {
  return null;
};
