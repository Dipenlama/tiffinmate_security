import winston from "winston";
import path from "path";
import { NODE_ENV } from "../config";

// Structured, append-only audit trail (NIST CSF "Detect" function; OWASP
// ASVS V7.1/V7.2 Log Content/Processing). This is deliberately separate from
// ordinary application/error logging: every entry here is a *security-
// relevant event* - who did what, from where, and whether it succeeded - so
// an incident investigation has something concrete to reconstruct a timeline
// from ("was this account brute-forced? when was MFA disabled, and by whom?").
//
// Hard rule enforced by convention at every call site below: never log
// passwords, tokens, secrets, or full request bodies. Only identifiers
// (user id/email), the action, outcome, and non-sensitive metadata.
export type AuditAction =
    | "auth.register"
    | "auth.login.success"
    | "auth.login.failure"
    | "auth.login.locked"
    | "auth.account.locked"
    | "auth.logout"
    | "auth.token.refresh"
    | "auth.token.reuse_detected"
    | "auth.password.reset.requested"
    | "auth.password.reset.completed"
    | "auth.mfa.enrolled"
    | "auth.mfa.verify.success"
    | "auth.mfa.verify.failure"
    | "auth.mfa.disabled"
    | "admin.user.created"
    | "admin.user.updated"
    | "admin.user.deleted";

export interface AuditEvent {
    action: AuditAction;
    outcome: "success" | "failure";
    actorId?: string;
    actorEmail?: string;
    targetId?: string;
    ip?: string;
    metadata?: Record<string, unknown>;
}

const logsDir = path.join(__dirname, "..", "..", "logs");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, "audit.log"),
            maxsize: 5 * 1024 * 1024, // 5MB per file
            maxFiles: 5, // simple built-in rotation, no extra dependency needed
        }),
    ],
    // Keep test runs quiet and avoid creating a logs/ directory as a side
    // effect of running the test suite.
    silent: NODE_ENV === "test",
});

if (NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

export function logAuditEvent(event: AuditEvent): void {
    logger.info(event.action, event);
}
