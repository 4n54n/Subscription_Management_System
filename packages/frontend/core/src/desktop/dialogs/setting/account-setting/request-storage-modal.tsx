import { ConfirmModal, Input, notify } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { GraphQLService } from '@affine/core/modules/cloud';
import { requestStorageIncreaseMutation } from '@affine/graphql';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

export const RequestStorageModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const [requestedGb, setRequestedGb] = useState('');
  const gqlService = useService(GraphQLService);

  const handleInputChange = useCallback((val: string) => {
    // Restrict input to digits only (integers, no dot)
    const clean = val.replace(/[^0-9]/g, '');
    setRequestedGb(clean);
  }, []);

  const handleConfirm = useAsyncCallback(async () => {
    if (!requestedGb || Number(requestedGb) <= 0) {
      notify.error({ title: 'Please enter a valid amount in GB' });
      return;
    }

    try {
      await gqlService.gql({
        query: requestStorageIncreaseMutation,
        variables: {
          requestedGb: parseInt(requestedGb, 10),
        },
      });
      notify.success({
        title: 'Storage request submitted successfully',
        message: 'Our support team has been notified of your request.',
      });
      setOpen(false);
      setRequestedGb('');
    } catch (e) {
      notify.error({
        title: 'Failed to send storage request',
        message: String(e),
      });
    }
  }, [gqlService, requestedGb, setOpen]);

  return (
    <ConfirmModal
      open={open}
      onOpenChange={setOpen}
      title="Request Storage Increase"
      confirmText="Send Request"
      onConfirm={handleConfirm}
      confirmButtonOptions={{
        disabled: !requestedGb || Number(requestedGb) <= 0,
        variant: 'primary',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '8px 0',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: 'var(--affine-text-secondary-color)',
          }}
        >
          Specify total storage space requested in GB (whole numbers only):
        </p>
        <Input
          value={requestedGb}
          placeholder="e.g. 50"
          onChange={handleInputChange}
          style={{ height: '36px', width: '100%' }}
        />
      </div>
    </ConfirmModal>
  );
};
