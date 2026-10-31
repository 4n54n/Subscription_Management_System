import { OverlayModal } from '@affine/component';
import { useI18n } from '@affine/i18n';

export const StarAFFiNEModal = ({
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
          src={'/static/githubStar.mp4'}
          autoPlay
          loop
        />
      }
      title={t['com.IntoAI.star-IntoAI.title']()}
      onOpenChange={setOpen}
      description={t['com.IntoAI.star-IntoAI.description']()}
      cancelText={t['com.IntoAI.star-IntoAI.cancel']()}
      to={BUILD_CONFIG.githubUrl}
      confirmButtonOptions={{
        variant: 'primary',
      }}
      confirmText={t['com.IntoAI.star-IntoAI.confirm']()}
      external
    />
  );
};
