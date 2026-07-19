import rateLimit from "express-rate-limit";

// IP-based rate limiting (OWASP A07:2021 Identification & Authentication
// Failures). This is deliberately paired with the per-account lockout in
// auth.service.ts: rate limiting alone doesn't stop an attacker distributing
// guesses across many IPs at one account, and account lockout alone doesn't
// stop an attacker spraying one common password across many accounts from a
// single IP. Together they cover both attack shapes.

// The Jest integration suite runs many sequential requests against these same
// routes from the same in-memory client (supertest, --runInBand) within
// seconds - real limiter enforcement there would make the test suite itself
// look like an attacker. Skip enforcement under NODE_ENV=test (set
// automatically by Jest); read process.env directly (not the cached config
// export) so the dedicated rate-limit test below can flip it back on for a
// single test by toggling process.env.NODE_ENV around the assertion.
const skipInTest = () => process.env.NODE_ENV === 'test';

// Tight limit on login/MFA verification: these are the highest-value targets
// for credential stuffing / brute force.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: { success: false, message: "Too many login attempts. Please try again later." },
});

// Looser limit for registration - still bounded to slow down mass fake-account creation.
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: { success: false, message: "Too many accounts created from this network. Please try again later." },
});

// Forgot-password is the tightest limit: each request triggers an email/log
// write, and it's a classic target for enumeration/spam.
export const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: { success: false, message: "Too many password reset requests. Please try again later." },
});
