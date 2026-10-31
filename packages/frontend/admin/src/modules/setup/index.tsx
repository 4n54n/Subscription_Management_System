import { Navigate } from 'react-router-dom';

import { useServerConfig } from '../common';
import { Form } from './form';
import logo from './logo.svg';

export function Setup() {
  const config = useServerConfig();

  if (config.initialized) {
    return <Navigate to="/admin" />;
  }

  return (
    <div className="w-full lg:grid lg:grid-cols-2 h-screen overflow-hidden bg-background">
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-16 h-full overflow-y-auto">
        <Form />
      </div>
      <div className="hidden lg:flex items-center justify-center p-8 lg:p-12 bg-muted/10 overflow-hidden">
        <img
          src={logo}
          alt="IntoAI Setup"
          className="max-h-[90%] max-w-[90%] object-contain pointer-events-none select-none drop-shadow-sm"
        />
      </div>
    </div>
  );
}

export { Setup as Component };
