import { FlexWrapper, Input, notify } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
} from '@affine/component/setting-components';
import { Avatar } from '@affine/component/ui/avatar';
import { Button } from '@affine/component/ui/button';
import { useSignOut } from '@affine/core/components/hooks/affine/use-sign-out';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useCatchEventCallback } from '@affine/core/components/hooks/use-catch-event-hook';
import { Upload } from '@affine/core/components/pure/file-upload';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { SubscriptionPlan } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { ArrowRightSmallIcon, CameraIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import { AuthService, ServerService } from '../../../../modules/cloud';
import type { SettingState } from '../types';
import { StorageProgress } from './storage-progress';
import * as styles from './style.css';

export const UserAvatar = () => {
  const t = useI18n();
  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);

  const handleUpdateUserAvatar = useAsyncCallback(
    async (file: File) => {
      try {
        track.$.settingsPanel.accountSettings.uploadAvatar();
        await session.uploadAvatar(file);
        notify.success({ title: 'Update user avatar success' });
      } catch (e) {
        // TODO(@catsjuice): i18n
        notify.error({
          title: 'Update user avatar failed',
          message: String(e),
        });
      }
    },
    [session]
  );

  const handleRemoveUserAvatar = useCatchEventCallback(async () => {
    track.$.settingsPanel.accountSettings.removeAvatar();
    await session.removeAvatar();
  }, [session]);

  return (
    <Upload
      accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"
      fileChange={handleUpdateUserAvatar}
      data-testid="upload-user-avatar"
    >
      <Avatar
        size={56}
        name={account?.label}
        url={account?.avatar}
        hoverIcon={<CameraIcon />}
        onRemove={account?.avatar ? handleRemoveUserAvatar : undefined}
        avatarTooltipOptions={{ content: t['Click to replace photo']() }}
        removeTooltipOptions={{ content: t['Remove photo']() }}
        data-testid="user-setting-avatar"
        removeButtonProps={{
          ['data-testid' as string]: 'user-setting-remove-avatar-button',
        }}
      />
    </Upload>
  );
};

export const AvatarAndName = () => {
  const t = useI18n();
  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);
  const [input, setInput] = useState<string>(account?.label ?? '');
  const [roleInput, setRoleInput] = useState<string>(account?.info?.userRole ?? '');

  useEffect(() => {
    if (account) {
      setInput(account.label ?? '');
      setRoleInput(account.info?.userRole ?? '');
    }
  }, [account]);

  const allowUpdate = (!!input && input !== account?.label) || (roleInput !== (account?.info?.userRole ?? ''));

  const handleUpdateProfile = useAsyncCallback(async () => {
    if (account === null) {
      return;
    }
    if (!allowUpdate) {
      return;
    }

    try {
      track.$.settingsPanel.accountSettings.updateUserName();
      await session.updateProfile({
        name: input,
        userRole: roleInput || null,
      });
      notify.success({ title: 'Profile updated successfully' });
    } catch (e) {
      notify.error({
        title: 'Failed to update profile.',
        message: String(e),
      });
    }
  }, [account, allowUpdate, session, input, roleInput]);

  return (
    <SettingRow
      name={t['com.IntoAI.settings.profile']()}
      desc={t['com.IntoAI.settings.profile.message']()}
      spreadCol={false}
    >
      <FlexWrapper style={{ margin: '12px 0 24px 0' }} alignItems="center">
        <UserAvatar />

        <div className={styles.profileInputWrapper}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label>{t['com.IntoAI.settings.profile.name']()}</label>
              <Input
                value={input}
                data-testid="user-name-input"
                placeholder={t['com.IntoAI.settings.profile.placeholder']()}
                maxLength={64}
                style={{ width: 280, height: 32 }}
                onChange={setInput}
                onEnter={handleUpdateProfile}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label>Role</label>
              <Input
                value={roleInput}
                placeholder="Enter role (e.g. Developer, Designer)"
                maxLength={64}
                style={{ width: 280, height: 32 }}
                onChange={setRoleInput}
                onEnter={handleUpdateProfile}
              />
            </div>
          </div>
          {allowUpdate ? (
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                data-testid="save-user-name"
                onClick={handleUpdateProfile}
              >
                {t['com.IntoAI.editCollection.save']()}
              </Button>
            </div>
          ) : null}
        </div>
      </FlexWrapper>
    </SettingRow>
  );
};

export const UserCompanyLogo = ({
  logoUrl,
  onChange,
}: {
  logoUrl?: string | null;
  onChange: (logo: string | null) => void;
}) => {
  const t = useI18n();
  const handleUpdateLogo = useAsyncCallback(
    async (file: File) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result as string);
        };
        reader.readAsDataURL(file);
        notify.success({ title: 'Company logo uploaded successfully' });
      } catch (e) {
        notify.error({ title: 'Failed to upload logo', message: String(e) });
      }
    },
    [onChange]
  );

  return (
    <Upload
      accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"
      fileChange={handleUpdateLogo}
    >
      <Avatar
        size={56}
        name="Company Logo"
        url={logoUrl || undefined}
        hoverIcon={<CameraIcon />}
        onRemove={logoUrl ? () => onChange(null) : undefined}
        avatarTooltipOptions={{ content: t['Click to replace photo']() }}
        removeTooltipOptions={{ content: t['Remove photo']() }}
      />
    </Upload>
  );
};

export const CompanyDetailsPanel = () => {
  const t = useI18n();
  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);

  const [companyName, setCompanyName] = useState(account?.info?.companyName ?? '');
  const [companyMail, setCompanyMail] = useState(account?.info?.companyMail ?? '');
  const [companySupportMail, setCompanySupportMail] = useState(account?.info?.companySupportMail ?? '');
  const [companyAddress, setCompanyAddress] = useState(account?.info?.companyAddress ?? '');
  const [cin, setCin] = useState(account?.info?.cin ?? '');
  const [companyLogo, setCompanyLogo] = useState(account?.info?.companyLogo ?? null);

  useEffect(() => {
    if (account?.info) {
      setCompanyName(account.info.companyName ?? '');
      setCompanyMail(account.info.companyMail ?? '');
      setCompanySupportMail(account.info.companySupportMail ?? '');
      setCompanyAddress(account.info.companyAddress ?? '');
      setCin(account.info.cin ?? '');
      setCompanyLogo(account.info.companyLogo ?? null);
    }
  }, [account]);

  const hasChanges =
    companyName !== (account?.info?.companyName ?? '') ||
    companyMail !== (account?.info?.companyMail ?? '') ||
    companySupportMail !== (account?.info?.companySupportMail ?? '') ||
    companyAddress !== (account?.info?.companyAddress ?? '') ||
    cin !== (account?.info?.cin ?? '') ||
    companyLogo !== (account?.info?.companyLogo ?? null);

  const handleSave = useAsyncCallback(async () => {
    try {
      await session.updateProfile({
        companyName: companyName || null,
        companyMail: companyMail || null,
        companySupportMail: companySupportMail || null,
        companyAddress: companyAddress || null,
        cin: cin || null,
        companyLogo: companyLogo || null,
      });
      notify.success({ title: 'Company profile updated successfully' });
    } catch (e) {
      notify.error({ title: 'Failed to update company profile', message: String(e) });
    }
  }, [session, companyName, companyMail, companySupportMail, companyAddress, cin, companyLogo]);

  return (
    <SettingRow
      name="Company profile"
      desc="Your organization's registered identity details."
      spreadCol={false}
    >
      <FlexWrapper style={{ margin: '12px 0 24px 0', width: '100%' }} alignItems="flex-start">
        <UserCompanyLogo logoUrl={companyLogo} onChange={setCompanyLogo} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '24px', flexGrow: 1, width: 'calc(100% - 80px)' }}>
          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company name</label>
              <Input
                value={companyName}
                placeholder="Input company name"
                maxLength={64}
                onChange={setCompanyName}
                style={{ height: 32, width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company email</label>
              <Input
                value={companyMail}
                placeholder="Input company email"
                maxLength={64}
                onChange={setCompanyMail}
                style={{ height: 32, width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company support email</label>
              <Input
                value={companySupportMail}
                placeholder="Input support email"
                maxLength={64}
                onChange={setCompanySupportMail}
                style={{ height: 32, width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>CIN (Corporate Identification Number)</label>
              <Input
                value={cin}
                placeholder="Input CIN number"
                maxLength={64}
                onChange={setCin}
                style={{ height: 32, width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company address</label>
              <Input
                value={companyAddress}
                placeholder="Input company address"
                maxLength={256}
                onChange={setCompanyAddress}
                style={{ height: 32, width: '100%' }}
              />
            </div>
          </div>

          {hasChanges && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button onClick={handleSave}>
                Save company info
              </Button>
            </div>
          )}
        </div>
      </FlexWrapper>
    </SettingRow>
  );
};

const StoragePanel = ({
  onChangeSettingState,
}: {
  onChangeSettingState?: (settingState: SettingState) => void;
}) => {
  const t = useI18n();

  const onUpgrade = useCallback(() => {
    track.$.settingsPanel.accountUsage.viewPlans({
      plan: SubscriptionPlan.Pro,
    });
    onChangeSettingState?.({
      activeTab: 'plans',
      scrollAnchor: 'cloudPricingPlan',
    });
  }, [onChangeSettingState]);

  return (
    <SettingRow
      name={t['com.IntoAI.storage.title']()}
      desc=""
      spreadCol={false}
    >
      <StorageProgress onUpgrade={onUpgrade} />
    </SettingRow>
  );
};

export const AccountSetting = ({
  onChangeSettingState,
}: {
  onChangeSettingState?: (settingState: SettingState) => void;
}) => {
  const { authService, serverService, globalDialogService } = useServices({
    AuthService,
    ServerService,
    GlobalDialogService,
  });
  const serverFeatures = useLiveData(serverService.server.features$);
  const t = useI18n();
  const session = authService.session;
  useEffect(() => {
    session.revalidate();
  }, [session]);
  const account = useLiveData(session.account$);
  const openSignOutModal = useSignOut();

  const onChangeEmail = useCallback(() => {
    if (!account) {
      return;
    }
    globalDialogService.open('verify-email', {
      server: serverService.server.baseUrl,
      changeEmail: !!account.info?.emailVerified,
    });
  }, [account, globalDialogService, serverService.server.baseUrl]);

  const onPasswordButtonClick = useCallback(() => {
    globalDialogService.open('change-password', {
      server: serverService.server.baseUrl,
    });
  }, [globalDialogService, serverService.server.baseUrl]);

  if (!account) {
    return null;
  }

  return (
    <>
      <SettingHeader
        title={t['com.IntoAI.setting.account']()}
        subtitle={t['com.IntoAI.setting.account.message']()}
        data-testid="account-title"
      />
      <AvatarAndName />
      <SettingRow name={t['com.IntoAI.settings.email']()} desc={account.email}>
        <Button onClick={onChangeEmail}>
          {account.info?.emailVerified
            ? t['com.IntoAI.settings.email.action.change']()
            : t['com.IntoAI.settings.email.action.verify']()}
        </Button>
      </SettingRow>
      <SettingRow
        name={t['com.IntoAI.settings.password']()}
        desc={t['com.IntoAI.settings.password.message']()}
      >
        <Button onClick={onPasswordButtonClick}>
          {account.info?.hasPassword
            ? t['com.IntoAI.settings.password.action.change']()
            : t['com.IntoAI.settings.password.action.set']()}
        </Button>
      </SettingRow>
      <StoragePanel onChangeSettingState={onChangeSettingState} />
      <SettingRow
        name={t[`Sign out`]()}
        desc={t['com.IntoAI.setting.sign.out.message']()}
        style={{ cursor: 'pointer' }}
        data-testid="sign-out-button"
        onClick={openSignOutModal}
      >
        <ArrowRightSmallIcon />
      </SettingRow>
      {/*<SettingRow*/}
      {/*  name={*/}
      {/*    <span style={{ color: 'var(--affine-warning-color)' }}>*/}
      {/*      {t['com.IntoAI.setting.account.delete']()}*/}
      {/*    </span>*/}
      {/*  }*/}
      {/*  desc={t['com.IntoAI.setting.account.delete.message']()}*/}
      {/*  style={{ cursor: 'pointer' }}*/}
      {/*  onClick={useCallback(() => {*/}
      {/*    toast('Function coming soon');*/}
      {/*  }, [])}*/}
      {/*  testId="delete-account-button"*/}
      {/*>*/}
      {/*  <ArrowRightSmallIcon />*/}
      {/*</SettingRow>*/}
    </>
  );
};
