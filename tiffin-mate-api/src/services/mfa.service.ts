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

export function decryptMfaSecret(encrypted: string): string {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
        // Secrets written before encryption was introduced (or a corrupted
        // row) won't have the iv:authTag:ciphertext shape - fail loudly
        // rather than silently mis-decrypting into garbage that would never
        // match any TOTP code.
        throw new Error("Malformed encrypted MFA secret");
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
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
