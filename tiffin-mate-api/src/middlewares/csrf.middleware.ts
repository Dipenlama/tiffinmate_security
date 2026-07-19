import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { IS_PRODUCTION } from "../config";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookies";

// Double-submit-cookie CSRF protection (OWASP CSRF Prevention Cheat Sheet).
//
// Why this is needed now (and wasn't before): the app used to send the JWT in
// an `Authorization: Bearer` header that frontend JS attached explicitly, so a
// malicious site could never make the browser send it automatically. Now that
// auth rides in cookies, the browser *will* attach those cookies to a request
// triggered by any site the victim happens to have open - a forged
// <form action="https://api/..."> POST from evil.com would ride on the
// victim's real session cookies unless we block it.
//
// How the double-submit pattern defeats that: the CSRF token is stored in a
// cookie the browser also auto-attaches, but a cross-site attacker cannot read
// that cookie's value (browsers block cross-origin cookie reads) to put it in
// the required `X-CSRF-Token` header. Only same-origin JS - which can read its
// own document.cookie - can construct a request that passes both checks.
export const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Endpoints that legitimately cannot carry a same-origin CSRF header:
//  - the Stripe webhook is called server-to-server and is authenticated
//    instead via its own HMAC signature (see payment.controller.ts webhook()).
//  - login/register/forgot-password/reset-password happen before any session
//    cookie exists, so there is no ambient credential yet for an attacker to
//    ride on. ("Login CSRF" - tricking a victim into an attacker's session -
//    is a real but much lower-severity concern than session hijacking and is
//    out of scope here.)
const EXEMPT_PATHS = new Set([
    "/api/payments/webhook",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
]);

export function issueCsrfToken(req: Request, res: Response) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // must be readable by same-origin frontend JS to echo back in a header
        secure: IS_PRODUCTION,
        sameSite: "strict",
        path: "/",
    });
    return res.status(200).json({ success: true, csrfToken: token });
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
        return next();
    }

    // CSRF is fundamentally an ambient-cookie problem: the browser attaches
    // cookies automatically to any request, cross-site or not, which is what
    // lets a forged <form>/fetch ride on a victim's session. A request that
    // instead authenticates with an explicit `Authorization: Bearer` header
    // cannot be forged the same way - a plain cross-site form cannot set
    // custom headers, and a script-driven cross-origin fetch would need the
    // token value already (which a remote attacker does not have) and would
    // in any case be blocked by our origin-allowlisted CORS policy. This is
    // what keeps every existing Postman/curl/supertest-style API call working
    // without needing to fetch a CSRF token first.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return next();
    }

    // Likewise, if there is no access-token cookie at all, there is no
    // ambient session for an attacker to ride on - let the request through
    // so the route's own auth middleware can reject it with the correct
    // "not authenticated" error instead of a confusing CSRF failure.
    if (!req.cookies?.[ACCESS_TOKEN_COOKIE]) {
        return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ success: false, message: "Invalid or missing CSRF token" });
    }

    return next();
}
