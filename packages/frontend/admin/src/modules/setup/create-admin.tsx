const MicrosoftIcon = () => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
    <path d="M0 0H10V10H0V0Z" fill="#F25022" />
    <path d="M11 0H21V10H11V0Z" fill="#7FBA00" />
    <path d="M0 11H10V21H0V11Z" fill="#00A4EF" />
    <path d="M11 11H21V21H11V11Z" fill="#FFB900" />
  </svg>
);

export type CreateAdminProps = {
  onMicrosoftSignIn?: () => void;
};

export const CreateAdmin = ({ onMicrosoftSignIn }: CreateAdminProps) => {
  return (
    <div className="flex flex-col justify-center w-full max-w-md font-sans">
      <div className="flex flex-col space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-mono font-semibold tracking-widest uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit">
          Setup Step 01
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans">
          Create Administrator Account
        </h1>
        <p className="text-sm text-muted-foreground font-sans leading-relaxed">
          This primary account manages server infrastructure and gains full user access. Authenticate with your Microsoft 365 organization account.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onMicrosoftSignIn}
          style={{
            width: '100%',
            height: '50px',
            background: '#0565ff',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            boxShadow: '0 4px 14px rgba(5, 101, 255, 0.25)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="hover:opacity-95 active:scale-[0.99] font-sans"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MicrosoftIcon />
            <span>Continue with Microsoft</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>→</span>
        </button>

        <p className="text-xs text-muted-foreground/80 text-center font-sans mt-1">
          Secure 1-click sign-in via Microsoft Entra ID / Azure AD
        </p>
      </div>
    </div>
  );
};
