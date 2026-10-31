import z from 'zod';

import { InvalidEmail, InvalidPasswordLength } from '../../base';

export function assertValidEmail(email: string) {
  const result = z.string().email().safeParse(email);
  if (!result.success) {
    throw new InvalidEmail({ email });
  }
}

export function assertValidPassword(
  password: string,
  _options?: { min?: number; max?: number }
) {
  if (!password || password.length <= 8) {
    throw new InvalidPasswordLength({
      min: 9,
      max: 128,
    });
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasSpecial) {
    throw new Error(
      'Password must be more than 8 characters and contain at least one uppercase letter, one lowercase letter, and one special character.'
    );
  }
}

export const validators = {
  assertValidEmail,
  assertValidPassword,
};
