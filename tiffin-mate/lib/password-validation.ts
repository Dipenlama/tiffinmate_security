export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must have at least 9 characters, one number, and one special character.';

export function validatePassword(password: string): string | null {
  if (
    password.length <= 8 ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password)
  ) {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }

  return null;
}

export function formatPasswordError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (/password|too common|uppercase|digit|symbol|character/i.test(message)) {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }

  return message || 'Unable to update password.';
}
