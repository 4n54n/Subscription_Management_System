import { Button, IconButton, Modal } from '@affine/component';
import { useBlurRoot } from '@affine/core/components/hooks/use-blur-root';
import { AuthService, SubscriptionService } from '@affine/core/modules/cloud';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { Trans, useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { ArrowLeftSmallIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toggleGeneralAIOnboarding } from './apis';
import * as baseStyles from './base-style.css';
import * as styles from './general.dialog.css';
import { Slider } from './slider';
import { showAIOnboardingGeneral$ } from './state';

type PlayListItem = { video: string; title: ReactNode; desc: ReactNode };
type Translate = ReturnType<typeof useI18n>;

const getPlayList = (t: Translate): Array<PlayListItem> => [
  {
    video: '/onboarding/ai-onboarding.general.1.mp4',
    title: t['com.IntoAI.ai-onboarding.general.1.title'](),
    desc: t['com.IntoAI.ai-onboarding.general.1.description'](),
  },
  {
    video: '/onboarding/ai-onboarding.general.2.mp4',
    title: t['com.IntoAI.ai-onboarding.general.2.title'](),
    desc: t['com.IntoAI.ai-onboarding.general.2.description'](),
  },
  {
    video: '/onboarding/ai-onboarding.general.3.mp4',
    title: t['com.IntoAI.ai-onboarding.general.3.title'](),
    desc: t['com.IntoAI.ai-onboarding.general.3.description'](),
  },
  {
    video: '/onboarding/ai-onboarding.general.4.mp4',
    title: t['com.IntoAI.ai-onboarding.general.4.title'](),
    desc: t['com.IntoAI.ai-onboarding.general.4.description'](),
  },
  {
    video: '/onboarding/ai-onboarding.general.5.mp4',
    title: t['com.IntoAI.ai-onboarding.general.5.title'](),
    desc: (
      <Trans
        i18nKey="com.IntoAI.ai-onboarding.general.5.description"
        values={{ link: 'ai.intoai.ai' }}
        components={{
          a: (
            <a
              className={styles.link}
              href="https://ai.intoai.ai"
              target="_blank"
              rel="noreferrer"
            />
          ),
        }}
      />
    ),
  },
];

let prefetched = false;
function prefetchVideos() {
  if (prefetched) return;
  const videos = [
    '/onboarding/ai-onboarding.general.1.mp4',
    '/onboarding/ai-onboarding.general.2.mp4',
    '/onboarding/ai-onboarding.general.3.mp4',
    '/onboarding/ai-onboarding.general.4.mp4',
    '/onboarding/ai-onboarding.general.5.mp4',
  ];
  videos.forEach(video => {
    const prefetchLink = document.createElement('link');
    prefetchLink.href = video;
    prefetchLink.rel = 'prefetch';
    document.head.append(prefetchLink);
  });
  prefetched = true;
}

export const AIOnboardingGeneral = () => {
  return null;
};
