import { OverlayModal } from '@affine/component';
import { useI18n } from '@affine/i18n';

export const IssueFeedbackModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const t = useI18n();

  return (
    <OverlayModal
      open={open}
      topImage={
        <video
          width={400}
          height={300}
          style={{ objectFit: 'cover' }}
          src={'/static/newIssue.mp4'}
          autoPlay
          loop
        />
      }
      title={t['com.IntoAI.issue-feedback.title']()}
      onOpenChange={setOpen}
      description={t['com.IntoAI.issue-feedback.description']()}
      cancelText={t['com.IntoAI.issue-feedback.cancel']()}
      to={BUILD_CONFIG.githubUrl}
      confirmText={t['com.IntoAI.issue-feedback.confirm']()}
      confirmButtonOptions={{
        variant: 'primary',
      }}
      external
    />
  );
};
