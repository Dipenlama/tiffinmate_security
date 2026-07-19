import crypto from "crypto";

// One-way hash for opaque, high-entropy secrets we need to look up later
// (password-reset tokens, refresh tokens). These are NOT passwords - they are
// already random and single-purpose, so a fast hash (SHA-256) is appropriate;
// unlike passwords, there is no brute-force-by-guessing risk to defend against
// with a slow KDF, only "don't store the usable secret in plaintext".
export function sha256Hex(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes: number = 64): string {
    return crypto.randomBytes(bytes).toString("hex");
}
