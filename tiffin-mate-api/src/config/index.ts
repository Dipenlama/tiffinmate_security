import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

// Fail-fast environment validation (OWASP ASVS V14.1 "Secure Config", NIST CSF PR.IP-1).
// A missing or weak secret must stop the server from booting rather than
// silently falling back to a guessable default (the previous code shipped
// with `process.env.JWT_SECRET || 'defaultsecret'`, which would happily run
// in production signing tokens with a secret anyone can read on GitHub).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5050),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  // Minimum 32 chars ~= 256 bits when used as an HMAC key for HS256 JWTs.
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters long'),
  // Exactly 64 hex chars = 32 bytes = a valid AES-256 key. Unlike passwords,
  // TOTP secrets must be recoverable to check a submitted code, so they are
  // encrypted (reversible) rather than hashed (one-way) at rest - this key
  // is what makes that reversible (OWASP ASVS V6.2, A02:2021).
  MFA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'MFA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'),
  // hCaptcha secret used server-side to verify a submitted captcha token
  // (OWASP ASVS V2.2.4 "anti-automation controls" on register/login/
  // forgot-password). Optional outside production so local dev/CI/tests
  // don't need a real hCaptcha account - captcha.middleware.ts skips
  // enforcement (with a warning) when this is unset. In production it is
  // mandatory, enforced below, so the server can never silently boot with
  // brute-force/credential-stuffing protection disabled.
  // Empty string (not just "unset") must also count as "not configured" - an
  // env var left blank in a .env template or a container orchestrator's
  // `VAR: ${VAR:-}` substitution (e.g. docker-compose) is still *present*,
  // just empty, so a plain `.optional()` alone would reject it as an invalid
  // 0-length string instead of treating it the same as truly unset.
  CAPTCHA_SECRET_KEY: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1).optional()
  ),
}).superRefine((val, ctx) => {
  if (val.NODE_ENV === 'production' && !val.CAPTCHA_SECRET_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['CAPTCHA_SECRET_KEY'],
      message: 'CAPTCHA_SECRET_KEY is required in production',
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Never boot with an invalid/insecure configuration.
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsedEnv.error));
  process.exit(1);
}

const env = parsedEnv.data;

export const NODE_ENV = env.NODE_ENV;
export const IS_PRODUCTION = env.NODE_ENV === 'production';

export const PORT: number = env.PORT;

export const MONGO_URI: string = env.MONGO_URI;

// application level CONSTANTS
export const ACCESS_TOKEN_SECRET: string = env.ACCESS_TOKEN_SECRET;
export const MFA_ENCRYPTION_KEY: string = env.MFA_ENCRYPTION_KEY;
export const CAPTCHA_SECRET_KEY: string | undefined = env.CAPTCHA_SECRET_KEY;
