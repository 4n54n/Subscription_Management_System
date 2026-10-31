import { notify } from '@affine/component';
import {
  AuthContainer,
  AuthContent,
  AuthHeader,
  AuthInput,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService } from '@affine/core/modules/cloud';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';

import type { SignInState } from '.';
import { Back } from './back';

export const SignInWithEmailInputStep = ({
  state,
  changeState,
}: {
  state: SignInState;
  changeState: Dispatch<SetStateAction<SignInState>>;
}) => {
  const t = useI18n();
  const authService = useService(AuthService);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const onEmailChange = useCallback((value: string) => {
    setEmail(value);
    setEmailError(undefined);
  }, []);

  const onContinue = useAsyncCallback(async () => {
    if (!email || isLoading) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Check if the user has a password set.
      // Note: If the user doesn't exist, this successfully returns { registered: false, hasPassword: false }
      const result = await authService.checkUserByEmail(trimmedEmail);
      changeState(prev => ({
        ...prev,
        email: trimmedEmail,
        hasPassword: result?.hasPassword ?? false,
        step: result?.hasPassword ? 'signInWithPassword' : 'signInWithEmail',
      }));
    } catch (e: any) {
      // If checkUserByEmail fails, it's usually because the backend rejected the email
      // (e.g. domain restriction). Don't proceed to OTP screen, show the error here.
      setEmailError('Email domain not allowed or invalid email address.');
    } finally {
      setIsLoading(false);
    }
  }, [authService, changeState, email, isLoading]);

  return (
    <AuthContainer>
      <AuthHeader
        title={t['com.IntoAI.auth.sign.in']()}
        subTitle="Enter your email to continue"
      />
      <AuthContent>
        <AuthInput
          placeholder="Email address"
          onChange={onEmailChange}
          error={!!emailError}
          errorHint={emailError}
          onEnter={onContinue}
          type="email"
          required={true}
          autoFocus
        />

        <Button
          style={{ width: '100%' }}
          size="extraLarge"
          block={true}
          onClick={onContinue}
          loading={isLoading}
          disabled={!email || isLoading}
        >
          Continue
        </Button>
      </AuthContent>

      <Back changeState={changeState} />
    </AuthContainer>
  );
};
