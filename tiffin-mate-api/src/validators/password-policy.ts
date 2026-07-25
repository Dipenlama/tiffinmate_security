import { z } from 'zod';

const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must have at least 9 characters, one number, and one special character.';

export const passwordSchema = z
  .string()
  .max(128, 'Password must be at most 128 characters long')
  .refine(
    (password) =>
      password.length > 8 &&
      /\d/.test(password) &&
      /[^A-Za-z0-9\s]/.test(password),
    { message: PASSWORD_REQUIREMENTS_MESSAGE },
  );
