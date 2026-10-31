import { Button, ErrorMessage, Skeleton, Tooltip } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useEffect, useMemo, useState } from 'react';

import {
  ServerService,
  SubscriptionService,
  UserQuotaService,
} from '../../../../modules/cloud';
import { RequestStorageModal } from './request-storage-modal';
import * as styles from './storage-progress.css';

export interface StorageProgressProgress {
  upgradable?: boolean;
  onUpgrade: () => void;
}

enum ButtonType {
  Primary = 'primary',
  Default = 'secondary',
}

export const StorageProgress = ({ onUpgrade }: StorageProgressProgress) => {
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const t = useI18n();
  const quota = useService(UserQuotaService).quota;

  useEffect(() => {
    // revalidate quota to get the latest status
    quota.revalidate();
  }, [quota]);
  const color = useLiveData(quota.color$);
  const usedFormatted = useLiveData(quota.usedFormatted$);
  const maxFormatted = useLiveData(quota.maxFormatted$);
  const percent = useLiveData(quota.percent$);

  const serverService = useService(ServerService);
  const hasPaymentFeature = useLiveData(
    serverService.server.features$.map(f => f?.payment)
  );
  const subscription = useService(SubscriptionService).subscription;
  useEffect(() => {
    // revalidate subscription to get the latest status
    subscription.revalidate();
  }, [subscription]);

  const proSubscription = useLiveData(subscription.pro$);
  const isFreeUser = !proSubscription;
  const quotaName = useLiveData(
    quota.quota$.map(q => (q !== null ? q?.humanReadable.name : null))
  );

  const loading =
    proSubscription === null || percent === null || quotaName === null;
  const loadError = useLiveData(quota.error$);

  const buttonType = useMemo(() => {
    if (isFreeUser) {
      return ButtonType.Primary;
    }
    return ButtonType.Default;
  }, [isFreeUser]);

  if (loading) {
    if (loadError) {
      // TODO(@catsjuice): i18n
      return <ErrorMessage>Load error</ErrorMessage>;
    }
    return <Skeleton height={42} />;
  }

  return (
    <>
      <div className={styles.storageProgressContainer}>
        <div className={styles.storageProgressWrapper}>
          <div className="storage-progress-desc">
            <span>{t['com.IntoAI.storage.used.hint']()}</span>
            <span>
              {usedFormatted}/{maxFormatted}
              {` (`}
              <button
                type="button"
                onClick={() => setOpenRequestModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--affine-link-color, #136dfb)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  font: 'inherit',
                }}
              >
                Need more?
              </button>
              {`)`}
            </span>
          </div>

        <div className="storage-progress-bar-wrapper">
          <div
            className={styles.storageProgressBar}
            style={{
              width: `${percent}%`,
              backgroundColor: color ?? cssVar('processingColor'),
            }}
          ></div>
        </div>
      </div>

      {hasPaymentFeature ? (
        <Tooltip
          options={{ hidden: percent < 100 }}
          content={
            isFreeUser
              ? t['com.IntoAI.storage.maximum-tips']()
              : t['com.IntoAI.storage.maximum-tips.pro']()
          }
        >
          <span tabIndex={0}>
            <Button variant={buttonType} onClick={onUpgrade}>
              {isFreeUser
                ? t['com.IntoAI.storage.upgrade']()
                : t['com.IntoAI.storage.change-plan']()}
            </Button>
          </span>
        </Tooltip>
      ) : null}
      </div>
      <RequestStorageModal
        open={openRequestModal}
        setOpen={setOpenRequestModal}
      />
    </>
  );
};
