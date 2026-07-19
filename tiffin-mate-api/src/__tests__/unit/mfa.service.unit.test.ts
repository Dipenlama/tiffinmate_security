import { encryptMfaSecret, decryptMfaSecret, generateMfaSecret, verifyMfaCode } from "../../services/mfa.service";
import { authenticator } from "otplib";

describe("MFA secret encryption at rest", () => {
	it("round-trips a secret through encrypt -> decrypt", () => {
		const secret = generateMfaSecret();
		const encrypted = encryptMfaSecret(secret);
		expect(decryptMfaSecret(encrypted)).toBe(secret);
	});

	it("never stores the plaintext secret as a substring of the encrypted value", () => {
		const secret = generateMfaSecret();
		const encrypted = encryptMfaSecret(secret);
		expect(encrypted).not.toContain(secret);
	});

	it("produces a different ciphertext each time (random IV) for the same secret", () => {
		const secret = generateMfaSecret();
		const a = encryptMfaSecret(secret);
		const b = encryptMfaSecret(secret);
		expect(a).not.toBe(b);
		expect(decryptMfaSecret(a)).toBe(secret);
		expect(decryptMfaSecret(b)).toBe(secret);
	});

	it("is stored in the iv:authTag:ciphertext hex format", () => {
		const encrypted = encryptMfaSecret(generateMfaSecret());
		const parts = encrypted.split(":");
		expect(parts).toHaveLength(3);
		for (const part of parts) {
			expect(part).toMatch(/^[0-9a-f]+$/);
		}
	});

	it("rejects a tampered ciphertext instead of silently decrypting to garbage", () => {
		const encrypted = encryptMfaSecret(generateMfaSecret());
		const [iv, authTag, ciphertext] = encrypted.split(":");
		// Flip a byte in the ciphertext - GCM's auth tag must catch this.
		const tamperedByte = (parseInt(ciphertext.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, "0");
		const tampered = `${iv}:${authTag}:${tamperedByte}${ciphertext.slice(2)}`;
		expect(() => decryptMfaSecret(tampered)).toThrow();
	});

	it("rejects a malformed (non iv:authTag:ciphertext) value", () => {
		expect(() => decryptMfaSecret("not-encrypted-at-all")).toThrow("Malformed encrypted MFA secret");
	});

	it("a decrypted secret still produces a code that verifyMfaCode accepts", () => {
		const secret = generateMfaSecret();
		const encrypted = encryptMfaSecret(secret);
		const code = authenticator.generate(decryptMfaSecret(encrypted));
		expect(verifyMfaCode(code, decryptMfaSecret(encrypted))).toBe(true);
	});
});
