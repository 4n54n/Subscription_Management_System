import { isAdmin, useCurrentUser } from '../common';
import { Navigate } from 'react-router-dom';
import oneLogoLight from '@affine/core/assets/one-logo-light.png';
import illustrationLight from '@affine/core/assets/other-page.light.png';
import { useCompanyProfile } from '@affine/core/desktop/pages/workspace/documents-shared/use-company-profile';

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const SecurityShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0565ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export function Auth() {
  const currentUser = useCurrentUser();
  const companyProfile = useCompanyProfile();

  const handleOAuthLogin = (provider: string) => {
    const redirectUri = encodeURIComponent(window.location.origin + '/admin');
    window.location.href = `/oauth/login?provider=${provider}&redirect_uri=${redirectUri}`;
  };

  if (currentUser && isAdmin(currentUser)) {
    return <Navigate to="/admin" />;
  }

  const termsUrl = companyProfile.termsOfServiceUrl || companyProfile.websiteUrl || 'https://intoai.ai/terms';
  const privacyUrl = companyProfile.privacyPolicyUrl || companyProfile.websiteUrl || 'https://intoai.ai/privacy';
  const currentYear = new Date().getFullYear();

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* LEFT COLUMN: Form & Branding */}
      <div
        style={{
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Left Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={companyProfile.logoSrc || oneLogoLight}
            alt="Company Logo"
            style={{
              height: '78px',
              maxHeight: '96px',
              width: 'auto',
              objectFit: 'contain',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = oneLogoLight;
            }}
          />
        </div>

        {/* Center Content */}
        <div style={{ maxWidth: '440px', width: '100%', margin: '40px 0' }}>
          <h1
            style={{
              fontSize: '38px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 12px 0',
              letterSpacing: '-1px',
              lineHeight: 1.15,
            }}
          >
            Welcome to One
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#64748b',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            Your workspace for research, projects and insights.
          </p>

          {/* Blue Accent Bar */}
          <div
            style={{
              width: '48px',
              height: '4px',
              background: '#0565ff',
              borderRadius: '2px',
              marginBottom: '36px',
            }}
          />

          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '16px',
            }}
          >
            Sign in to continue
          </p>

          {/* Microsoft OAuth Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('Microsoft')}
            style={{
              width: '100%',
              height: '52px',
              background: '#0565ff',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              boxShadow: '0 4px 14px rgba(5, 101, 255, 0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MicrosoftIcon />
              <span>Continue with Microsoft</span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>→</span>
          </button>

          {/* Security Note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secure sign-in with your Microsoft account</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '20px',
          }}
        >
          <span>
            © {currentYear} {companyProfile.companyName ? 'One' : 'One'}. All rights reserved.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={termsUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0565ff', textDecoration: 'none', fontWeight: 500 }}
            >
              Terms of use
            </a>
            <span>|</span>
            <a
              href={privacyUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0565ff', textDecoration: 'none', fontWeight: 500 }}
            >
              Privacy policy
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Illustration & Enterprise Security Card */}
      <div
        style={{
          background: '#f6f8fd',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          boxSizing: 'border-box',
          borderLeft: '1px solid #e2e8f0',
        }}
      >
        {/* Top/Middle: Hero Illustration Image */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '20px 0',
          }}
        >
          <img
            src={illustrationLight}
            alt="One System Illustration"
            style={{
              width: '92%',
              maxWidth: '640px',
              maxHeight: '520px',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.05))',
            }}
          />
        </div>

        {/* Enterprise-grade security box at bottom */}
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '16px 20px',
            background: 'transparent',
            borderRadius: '12px',
            textAlign: 'left',
          }}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <SecurityShieldIcon />
          </div>
          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 4px 0',
              }}
            >
              Enterprise-grade security
            </h4>
            <p
              style={{
                fontSize: '13px',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Your data is protected with Microsoft's enterprise-grade security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Auth as Component };
