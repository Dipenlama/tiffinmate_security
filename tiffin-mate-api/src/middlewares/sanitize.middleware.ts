import { Request, Response, NextFunction } from "express";

// NoSQL injection hardening (OWASP A03:2021 Injection). Zod already validates
// the *shape* of expected fields (e.g. LoginUserDto requires email/password to
// be strings), which blocks the classic `{ "email": { "$gt": "" } }` login
// bypass since an object fails `z.email()`. This middleware is defense in
// depth for the fields Zod doesn't cover - anything read via req.query,
// req.params, or spread/passthrough body fields - by stripping any object key
// that starts with `$` or contains a `.`, the two characters MongoDB
// interprets as query operators/path separators.
//
// We deliberately do not use the popular `express-mongo-sanitize` package
// here: it assumes it can do `req.query = sanitized`, but Express 5 defines
// `req.query` as a getter with no setter (it re-parses the URL on every
// access), so that package throws on any request with a query string. We
// sanitize req.body/req.params in place (both are plain writable properties)
// and use Object.defineProperty to safely override just this request's
// req.query getter with the sanitized value.
function stripDangerousKeys(value: any): any {
    if (Array.isArray(value)) {
        return value.map(stripDangerousKeys);
    }
    if (value && typeof value === "object") {
        const clean: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith("$") || key.includes(".")) {
                continue; // drop the key entirely rather than trying to "fix" it
            }
            clean[key] = stripDangerousKeys(value[key]);
        }
        return clean;
    }
    return value;
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === "object") {
        req.body = stripDangerousKeys(req.body);
    }
    if (req.params && typeof req.params === "object") {
        req.params = stripDangerousKeys(req.params);
    }
    if (req.query && typeof req.query === "object") {
        const sanitizedQuery = stripDangerousKeys(req.query);
        Object.defineProperty(req, "query", {
            value: sanitizedQuery,
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }
    next();
}
