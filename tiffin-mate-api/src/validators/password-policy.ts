import { z } from 'zod';

// A short list of the most commonly leaked/guessed passwords (per common breach
// corpora such as "rockyou"). This is deliberately small - it is a defense-in-depth
// backstop, not a substitute for the length/complexity rules below. Real deployments
// would check against a much larger corpus (e.g. Have I Been Pwned's Pwned Passwords
// API using k-anonymity) but that is out of scope for this project.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'letmein123', 'iloveyou1', 'admin12345', 'welcome123',
  'abc123456', 'passw0rd1', 'trustno1a', 'football1', 'baseball1', 'dragon1234',
  'superman1', 'princess1', 'sunshine1', 'master1234', 'monkey1234',
]);

// OWASP ASVS V2.1 / NIST SP 800-63B aligned password policy:
// - Minimum length 10 (NIST recommends >= 8; we go a little further since this
//   app has no separate breached-password check beyond the small denylist above).
// - Requires a mix of character classes to resist simple dictionary/mask attacks.
// - Capped at 128 chars: bcrypt silently truncates input over 72 bytes, so an
//   unbounded max would let two different long passwords hash identically.
// - Rejected against a common-password denylist regardless of composition.
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol')
  .refine((pw) => !COMMON_PASSWORDS.has(pw.toLowerCase()), {
    message: 'This password is too common. Please choose a different one.',
  });
