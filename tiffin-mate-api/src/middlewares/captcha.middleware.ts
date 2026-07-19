import { Request, Response, NextFunction } from "express";
import { CAPTCHA_SECRET_KEY, NODE_ENV } from "../config";

// hCaptcha's siteverify endpoint (OWASP ASVS V2.2.4 "anti-automation
// controls"). Overridable via env so tests can point this at a local mock
// instead of a real third-party service.
const VERIFY_URL = process.env.CAPTCHA_VERIFY_URL || "https://hcaptcha.com/siteverify";

interface SiteverifyResponse {
    success: boolean;
    [key: string]: unknown;
}

// Applied to register/login/forgot-password: the three endpoints that are
// both unauthenticated (so IP/account rate limiting is the only other
// friction an attacker faces) and valuable to automate against (account
// creation spam, credential stuffing, reset-email flooding).
//
// CAPTCHA_SECRET_KEY is required in production (config/index.ts fails the
// server boot otherwise) but optional in development/test, so this only
// short-circuits outside production - it can never accidentally ship
// disabled in prod.
export async function verifyCaptcha(req: Request, res: Response, next: NextFunction) {
    if (!CAPTCHA_SECRET_KEY) {
        if (NODE_ENV !== "test") {
            console.warn("CAPTCHA_SECRET_KEY not set - skipping captcha verification (development only)");
        }
        return next();
    }

    const token = req.body?.captchaToken;
    if (!token || typeof token !== "string") {
        return res.status(400).json({ success: false, message: "Captcha verification is required" });
    }

    try {
        const params = new URLSearchParams();
        params.set("secret", CAPTCHA_SECRET_KEY);
        params.set("response", token);
        if (req.ip) params.set("remoteip", req.ip);

        const verifyRes = await fetch(VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const result = (await verifyRes.json()) as SiteverifyResponse;

        if (!result.success) {
            return res.status(400).json({ success: false, message: "Captcha verification failed" });
        }
        return next();
    } catch (err) {
        console.error("Captcha verification error", err);
        // Fail closed: if the captcha provider is unreachable, that must not
        // become a free pass around anti-automation controls on auth routes.
        return res.status(503).json({ success: false, message: "Captcha verification unavailable, please try again" });
    }
}
