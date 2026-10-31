import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useService } from '@toeverything/infra';
import { PresentationService } from '../../../../modules/presentation';
import illustrationLight from '../../../../assets/other-page.light.png';

export const Component = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const presentationService = useService(PresentationService);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invite token.');
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const roomData = await presentationService.getRoomByToken(inviteToken);
        if (roomData.status !== 'active') {
          setError('This presentation room has already ended.');
          return;
        }

        const roomPath = `/workspace/${roomData.workspaceId}/present/${roomData.id}`;

        // Save path lock for AuthGuard redirects if any
        sessionStorage.setItem('presentation_room_path', roomPath);

        // Redirect to staging room with inviteToken in query parameters
        window.location.href = `${roomPath}?inviteToken=${inviteToken}`;
      } catch (e) {
        console.error('[Presentation Join] Fetch room failed:', e);
        setError('Failed to load presentation room details.');
      }
    };

    fetchAndRedirect();
  }, [inviteToken, presentationService]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          background: 'var(--affine-background-primary-color)',
          color: 'var(--affine-text-primary-color)',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
          textAlign: 'center',
        }}
      >
        <img
          src={illustrationLight}
          alt="Presentation Ended"
          style={{
            width: '90%',
            maxWidth: '850px',
            maxHeight: '560px',
            height: 'auto',
            objectFit: 'contain',
            marginBottom: '20px',
            borderRadius: '20px',
          }}
        />
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 800,
            margin: 0,
            letterSpacing: '-0.5px',
            color: 'var(--affine-text-primary-color)',
          }}
        >
          Cannot Join Session
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--affine-text-secondary-color)',
            margin: 0,
            maxWidth: '420px',
            lineHeight: 1.6,
          }}
        >
          {error}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '12px',
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--affine-brand-color, #1e96eb)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30, 150, 235, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return null;
};
