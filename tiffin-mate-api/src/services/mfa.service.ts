import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { MFA_ENCRYPTION_KEY } from "../config";

// TOTP (RFC 6238) multi-factor authentication (OWASP ASVS V2.8 "Single or
// Multi Factor One Time Verifier"). Using an authenticator app (Google
// Authenticator, Authy, etc.) means the second factor never travels over the
// network at all - unlike SMS OTPs, it can't be intercepted or SIM-swapped.
//
// Allow 1 time-step (30s) of clock drift each side so the code entered a few
// seconds after it changes (a common UX moment) still verifies.
authenticator.options = { window: 1 };

const ISSUER = "TiffinMate";

// A leaked TOTP secret is a permanent second-factor bypass (unlike a
// password, it can't be re-hashed after the fact - whoever has it can
// generate valid codes forever). Unlike passwords, the raw secret must be
// recoverable to check a submitted code, so it is encrypted (reversible)
// rather than hashed at rest (OWASP ASVS V6.2, A02:2021 Cryptographic
// Failures). AES-256-GCM: 12-byte random IV per encryption, 16-byte auth tag
// binds ciphertext integrity so a tampered DB row fails to decrypt instead of
// silently producing a different (but "valid-looking") secret.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
    return Buffer.from(MFA_ENCRYPTION_KEY, "hex");
}

// Encrypted secrets are stored as `iv:authTag:ciphertext`, all hex-encoded,
// so the value stays a plain string column with no schema change needed.
export function encryptMfaSecret(plainSecret: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

// An encrypted value is always exactly 3 hex-encoded, colon-separated
// segments (iv:authTag:ciphertext). Anything else is a raw base32 TOTP
// secret (e.g. "JBSWY3DPEHPK3PXP") written by a server version that
// predates at-rest encryption - accounts that enrolled MFA before this
// change must keep working, not get hard-locked out of their own account.
function isEncryptedForm(value: string): boolean {
    const parts = value.split(":");
    return parts.length === 3 && parts.every((p) => /^[0-9a-fA-F]+$/.test(p));
}

// True when the stored value still needs migrating to the encrypted form -
// callers that successfully verify a code against a legacy plaintext secret
// should re-save it via encryptMfaSecret so it self-heals on next use.
export function needsMfaSecretMigration(stored: string): boolean {
    return !isEncryptedForm(stored);
}

export function decryptMfaSecret(stored: string): string {
    if (!isEncryptedForm(stored)) {
        // Legacy plaintext secret - nothing to decrypt, hand it back as-is.
        return stored;
    }
    const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, "hex")),
        decipher.final(),
    ]);
    return plaintext.toString("utf8");
}

export function generateMfaSecret(): string {
    return authenticator.generateSecret();
}

export async function buildMfaQrCode(email: string, secret: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrCodeDataUrl };
}

export function verifyMfaCode(code: string, secret: string): boolean {
    try {
        return authenticator.check(code, secret);
    } catch {
        // otplib throws on malformed input (e.g. non-numeric code) rather than
        // returning false - treat that the same as an invalid code.
        return false;
    }
}
