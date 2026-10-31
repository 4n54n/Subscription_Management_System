import logoImg from './logo.png';

export const Logo = () => {
  return (
    <img
      src={logoImg}
      alt="IntoAI Logo"
      style={{ height: '24px', width: '24px', objectFit: 'contain', display: 'block' }}
    />
  );
};
