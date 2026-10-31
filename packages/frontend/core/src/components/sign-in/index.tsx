import { DefaultServerService, type Server } from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { FrameworkScope, useService } from '@toeverything/infra';
import { useState } from 'react';

import { AddSelfhostedStep } from './add-selfhosted';
import { SignInStep } from './sign-in';
import { SignInWithEmailInputStep } from './sign-in-with-email-input';
import { SignInWithEmailStep } from './sign-in-with-email';
import { SignInWithPasswordStep } from './sign-in-with-password';

export type SignInStep =
  | 'signIn'
  | 'signInWithPasswordOrEmail'
  | 'signInWithPassword'
  | 'signInWithEmail'
  | 'addSelfhosted';

export interface SignInState {
  step: SignInStep;
  server?: Server;
  initialServerBaseUrl?: string;
  email?: string;
  hasPassword?: boolean;
  redirectUrl?: string;
}

export const SignInPanel = ({
  server: initialServerBaseUrl,
  initStep,
  onAuthenticated,
}: {
  onAuthenticated?: (status: AuthSessionStatus) => void;
  server?: string;
  initStep?: SignInStep | undefined;
}) => {
  const [state, setState] = useState<SignInState>({
    step: initStep
      ? initStep
      : initialServerBaseUrl
        ? 'addSelfhosted'
        : 'signIn',
    initialServerBaseUrl: initialServerBaseUrl,
  });

  const defaultServerService = useService(DefaultServerService);

  const step = state.step;
  const server = state.server ?? defaultServerService.server;

  return (
    <FrameworkScope scope={server.scope}>
      {step === 'signIn' ? (
        <SignInStep
          state={state}
          changeState={setState}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'signInWithPasswordOrEmail' ? (
        <SignInWithEmailInputStep state={state} changeState={setState} />
      ) : step === 'signInWithEmail' ? (
        <SignInWithEmailStep
          state={state}
          changeState={setState}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'signInWithPassword' ? (
        <SignInWithPasswordStep
          state={state}
          changeState={setState}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'addSelfhosted' ? (
        <AddSelfhostedStep state={state} changeState={setState} />
      ) : null}
    </FrameworkScope>
  );
};
