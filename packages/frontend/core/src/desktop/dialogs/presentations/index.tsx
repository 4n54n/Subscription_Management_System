import { Modal, Scrollable } from '@affine/component';
import type { DialogComponentProps } from '@affine/core/modules/dialogs';
import type { WORKSPACE_DIALOG_SCHEMA } from '@affine/core/modules/dialogs/constant';
import { WorkspaceSettingPresentations } from '../setting/workspace-setting/presentations';

export const PresentationsDialog = ({
  close,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['presentations']>) => {
  return (
    <Modal
      width={650}
      contentOptions={{
        style: {
          padding: '24px 0px 24px 24px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        },
      }}
      open
      onOpenChange={() => close()}
    >
      <Scrollable.Root>
        <Scrollable.Viewport style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '24px' }}>
          <WorkspaceSettingPresentations />
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>
    </Modal>
  );
};
