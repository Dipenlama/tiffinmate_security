import { Response } from "express";
import { IS_PRODUCTION } from "../config";

// Centralizes cookie flags so every place that issues or clears an auth cookie
// uses the same, deliberately chosen settings (OWASP ASVS V3.4 "Cookie-based
// Session Management"):
//   - httpOnly: JavaScript (and therefore any XSS payload) cannot read the
//     token via `document.cookie`. This is the whole reason we moved off
//     localStorage.
//   - secure: only sent over HTTPS in production. Disabled in dev so the app
//     still works over plain http://localhost.
//   - sameSite: 'strict' for the token cookies means the browser never
//     attaches them to a cross-site request, which is the first line of
//     defense against CSRF (the double-submit token middleware is the second).
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const ROLE_COOKIE = "role";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes - matches the JWT's expiresIn
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function setAuthCookies(
    res: Response,
    params: { accessToken: string; refreshToken: string; role: string }
) {
    res.cookie(ACCESS_TOKEN_COOKIE, params.accessToken, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "strict",
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, params.refreshToken, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "strict",
        // Scoped to the auth routes only, so this longer-lived, more powerful
        // token is never sent to (or leaked by) unrelated API endpoints.
        path: "/api/auth",
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    // Not secret - only used by Next.js middleware / the frontend to decide
    // which dashboard to redirect to. Real authorization is always re-checked
    // server-side (adminMiddleware), so this cookie carries no trust.
    res.cookie(ROLE_COOKIE, params.role, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/auth" });
    res.clearCookie(ROLE_COOKIE, { path: "/" });
}
