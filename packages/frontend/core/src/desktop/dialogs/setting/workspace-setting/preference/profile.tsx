import { FlexWrapper, Input, notify, Wrapper } from '@affine/component';
import { Button } from '@affine/component/ui/button';
import { Avatar } from '@affine/component/ui/avatar';
import { useCatchEventCallback } from '@affine/core/components/hooks/use-catch-event-hook';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { Upload } from '@affine/core/components/pure/file-upload';
import { WorkspaceAvatar } from '@affine/core/components/workspace-avatar';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { validateAndReduceImage } from '@affine/core/utils/reduce-image';
import { UNTITLED_WORKSPACE_NAME } from '@affine/env/constant';
import { useI18n } from '@affine/i18n';
import { CameraIcon } from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { map } from 'rxjs';

import * as style from './style.css';

const EmailTagInput = ({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) => {
  const [inputValue, setInputValue] = useState('');

  const commitInput = () => {
    const email = inputValue.trim().replace(/,/g, '');
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        notify.error({ title: 'Invalid email address' });
        return;
      }
      if (tags.includes(email)) {
        setInputValue('');
        return;
      }
      onChange([...tags, email]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput();
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      padding: '6px',
      border: '1px solid var(--affine-border-color)',
      borderRadius: '8px',
      background: 'var(--affine-background-primary-color)',
      minHeight: '36px',
      width: '100%',
      alignItems: 'center',
      transition: 'border-color 0.2s',
    }}>
      {tags.map((tag, index) => (
        <span key={index} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--affine-brand-color)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {tag}
          <span
            onClick={() => removeTag(index)}
            style={{
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              marginLeft: '2px',
            }}
          >
            ×
          </span>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitInput}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          border: 'none',
          outline: 'none',
          flexGrow: 1,
          background: 'transparent',
          color: 'var(--affine-text-primary-color)',
          fontSize: '12px',
          minWidth: '120px',
          height: '24px',
        }}
      />
    </div>
  );
};

export const ClientDetailsPanel = () => {
  const t = useI18n();
  const workspace = useService(WorkspaceService).workspace;
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);

  const [companyName, setCompanyName] = useState('');
  const [companyMail, setCompanyMail] = useState('');
  const [billingMailTo, setBillingMailTo] = useState<string[]>([]);
  const [billingMailCc, setBillingMailCc] = useState<string[]>([]);
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [authorizedMails, setAuthorizedMails] = useState<string[]>([]);

  const meta = workspace?.docCollection?.meta as any;

  useEffect(() => {
    if (meta) {
      setCompanyName(meta.companyName ?? '');
      setCompanyMail(meta.companyMail ?? '');
      
      const toStr = meta.billingMailTo ?? '';
      setBillingMailTo(toStr ? toStr.split(',') : []);

      const ccStr = meta.billingMailCc ?? '';
      setBillingMailCc(ccStr ? ccStr.split(',') : []);

      setCompanyAddress(meta.companyAddress ?? '');
      setCompanyLogo(meta.companyLogo ?? null);

      const authStr = meta.authorizedMails ?? '';
      setAuthorizedMails(authStr ? authStr.split(',') : []);

      const dispose = meta.commonFieldsUpdated.subscribe(() => {
        setCompanyName(meta.companyName ?? '');
        setCompanyMail(meta.companyMail ?? '');
        const currentToStr = meta.billingMailTo ?? '';
        setBillingMailTo(currentToStr ? currentToStr.split(',') : []);
        const currentCcStr = meta.billingMailCc ?? '';
        setBillingMailCc(currentCcStr ? currentCcStr.split(',') : []);
        setCompanyAddress(meta.companyAddress ?? '');
        setCompanyLogo(meta.companyLogo ?? null);
        const currentAuthStr = meta.authorizedMails ?? '';
        setAuthorizedMails(currentAuthStr ? currentAuthStr.split(',') : []);
      });

      return () => {
        dispose.unsubscribe();
      };
    }
    return;
  }, [meta]);

  const hasChanges =
    companyName !== (meta?.companyName ?? '') ||
    companyMail !== (meta?.companyMail ?? '') ||
    billingMailTo.join(',') !== (meta?.billingMailTo ?? '') ||
    billingMailCc.join(',') !== (meta?.billingMailCc ?? '') ||
    companyAddress !== (meta?.companyAddress ?? '') ||
    companyLogo !== (meta?.companyLogo ?? null) ||
    authorizedMails.join(',') !== (meta?.authorizedMails ?? '');

  const handleSave = useCallback(() => {
    if (!meta) return;
    meta.setCompanyName(companyName);
    meta.setCompanyMail(companyMail);
    meta.setBillingMailTo(billingMailTo.join(','));
    meta.setBillingMailCc(billingMailCc.join(','));
    meta.setCompanyAddress(companyAddress);
    meta.setCompanyLogo(companyLogo ?? '');
    meta.setAuthorizedMails(authorizedMails.join(','));
    notify.success({ title: 'Client details saved successfully' });
  }, [meta, companyName, companyMail, billingMailTo, billingMailCc, companyAddress, companyLogo, authorizedMails]);

  const handleLogoChange = useCallback(
    (file: File | null) => {
      if (!file) {
        setCompanyLogo(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  if (!isOwner) return null;

  return (
    <div style={{
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: '1px solid var(--affine-border-color)',
      width: '100%',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '16px',
        color: 'var(--affine-text-primary-color)',
      }}>
        Client & Billing Information
      </div>

      <FlexWrapper style={{ width: '100%' }} alignItems="flex-start">
        <Upload
          accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"
          fileChange={handleLogoChange}
        >
          <Avatar
            size={56}
            name="Client Logo"
            url={companyLogo || undefined}
            hoverIcon={<CameraIcon />}
            onRemove={companyLogo ? () => setCompanyLogo(null) : undefined}
            avatarTooltipOptions={{ content: t['Click to replace photo']() }}
            removeTooltipOptions={{ content: t['Remove photo']() }}
          />
        </Upload>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '24px', flexGrow: 1, width: 'calc(100% - 80px)' }}>
          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company name</label>
              <Input
                value={companyName}
                placeholder="Input client company name"
                maxLength={64}
                onChange={setCompanyName}
                style={{ height: 32, width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company email</label>
              <Input
                value={companyMail}
                placeholder="Input client company email"
                maxLength={64}
                onChange={setCompanyMail}
                style={{ height: 32, width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Billing Mail TO (Press Enter or comma to add)</label>
              <EmailTagInput
                tags={billingMailTo}
                onChange={setBillingMailTo}
                placeholder="billing.to@example.com"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Billing Mail CC (Press Enter or comma to add)</label>
              <EmailTagInput
                tags={billingMailCc}
                onChange={setBillingMailCc}
                placeholder="billing.cc@example.com"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Company address</label>
            <Input
              value={companyAddress}
              placeholder="Input client address"
              maxLength={256}
              onChange={setCompanyAddress}
              style={{ height: 32, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>Authorized Mails (Press Enter or comma to add)</label>
            <EmailTagInput
              tags={authorizedMails}
              onChange={setAuthorizedMails}
              placeholder="guest.user@example.com"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: '#0f62fe', color: '#ffffff', fontWeight: 600 }}
            >
              Save client details
            </Button>
          </div>
        </div>
      </FlexWrapper>
    </div>
  );
};

export const ProfilePanel = () => {
  const t = useI18n();

  const workspace = useService(WorkspaceService).workspace;
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  useEffect(() => {
    permissionService.permission.revalidate();
  }, [permissionService]);
  const workspaceIsReady = useLiveData(
    useMemo(() => {
      return workspace
        ? LiveData.from(
            workspace.engine.doc
              .docState$(workspace.id)
              .pipe(map(v => v.ready)),
            false
          )
        : null;
    }, [workspace])
  );
  const [name, setName] = useState('');

  useEffect(() => {
    if (workspace?.docCollection) {
      setName(workspace.docCollection.meta.name ?? UNTITLED_WORKSPACE_NAME);
      const dispose =
        workspace.docCollection.meta.commonFieldsUpdated.subscribe(() => {
          setName(workspace.docCollection.meta.name ?? UNTITLED_WORKSPACE_NAME);
        });
      return () => {
        dispose.unsubscribe();
      };
    } else {
      setName(UNTITLED_WORKSPACE_NAME);
    }
    return;
  }, [workspace]);

  const setWorkspaceAvatar = useCallback(
    async (file: File | null) => {
      if (!workspace) {
        return;
      }
      if (!file) {
        workspace.docCollection.meta.setAvatar('');
        return;
      }
      try {
        const reducedFile = await validateAndReduceImage(file);
        const blobs = workspace.docCollection.blobSync;
        const blobId = await blobs.set(reducedFile);
        workspace.docCollection.meta.setAvatar(blobId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [workspace]
  );

  const setWorkspaceName = useCallback(
    (name: string) => {
      if (!workspace) {
        return;
      }
      workspace.docCollection.meta.setName(name);
    },
    [workspace]
  );

  const [input, setInput] = useState<string>('');
  useEffect(() => {
    setInput(name);
  }, [name]);

  const handleUpdateWorkspaceName = useCallback(
    (name: string) => {
      setWorkspaceName(name);
      notify.success({ title: t['Update workspace name success']() });
    },
    [setWorkspaceName, t]
  );

  const handleSetInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.code === 'Enter' && name !== input) {
        handleUpdateWorkspaceName(input);
      }
    },
    [handleUpdateWorkspaceName, input, name]
  );

  const handleClick = useCallback(() => {
    handleUpdateWorkspaceName(input);
  }, [handleUpdateWorkspaceName, input]);

  const handleRemoveUserAvatar = useCatchEventCallback(async () => {
    await setWorkspaceAvatar(null);
  }, [setWorkspaceAvatar]);

  const handleUploadAvatar = useCallback(
    (file: File) => {
      setWorkspaceAvatar(file)
        .then(() => {
          notify.success({ title: 'Update workspace avatar success' });
        })
        .catch(error => {
          notify.error({
            title: 'Update workspace avatar failed',
            message: error,
          });
        });
    },
    [setWorkspaceAvatar]
  );

  const canAdjustAvatar = workspaceIsReady && isOwner;

  return (
    <div className={style.profileWrapper} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Upload
          accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"
          fileChange={handleUploadAvatar}
          data-testid="upload-avatar"
          disabled={!isOwner}
        >
          <WorkspaceAvatar
            meta={workspace.meta}
            size={56}
            name={name}
            rounded={8}
            colorfulFallback
            hoverIcon={isOwner ? <CameraIcon /> : undefined}
            onRemove={canAdjustAvatar ? handleRemoveUserAvatar : undefined}
            avatarTooltipOptions={
              canAdjustAvatar
                ? { content: t['Click to replace photo']() }
                : undefined
            }
            removeTooltipOptions={
              canAdjustAvatar ? { content: t['Remove photo']() } : undefined
            }
            data-testid="workspace-setting-avatar"
            removeButtonProps={{
              ['data-testid' as string]: 'workspace-setting-remove-avatar-button',
            }}
          />
        </Upload>

        <Wrapper marginLeft={20} style={{ flexGrow: 1 }}>
          <div className={style.label}>{t['Workspace Name']()}</div>
          <FlexWrapper alignItems="center" flexGrow="1">
            <Input
              disabled={!workspaceIsReady || !isOwner}
              value={input}
              style={{ width: 280, height: 32 }}
              data-testid="workspace-name-input"
              placeholder={t['Workspace Name']()}
              maxLength={64}
              minLength={0}
              onChange={handleSetInput}
              onKeyUp={handleKeyUp}
            />
            {input === name ? null : (
              <Button
                data-testid="save-workspace-name"
                onClick={handleClick}
                style={{
                  marginLeft: '12px',
                }}
              >
                {t['com.IntoAI.editCollection.save']()}
              </Button>
            )}
          </FlexWrapper>
        </Wrapper>
      </div>

      <ClientDetailsPanel />
    </div>
  );
};
