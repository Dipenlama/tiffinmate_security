import request from "supertest";
import app from "../../app";
import { authenticator } from "otplib";
import { UserModel } from "../../models/user.model";
import { decryptMfaSecret } from "../../services/mfa.service";

async function registerAndLogin(email: string, username: string) {
	await request(app).post("/api/auth/register").send({
		email,
		username,
		password: "Str0ng!Passw0rd",
		confirmPassword: "Str0ng!Passw0rd",
	});
	const login = await request(app).post("/api/auth/login").send({ email, password: "Str0ng!Passw0rd" });
	return login.body.token as string;
}

describe("MFA (TOTP) integration", () => {
	it("full enroll -> login-requires-mfa -> verify -> disable lifecycle", async () => {
		const token = await registerAndLogin("mfauser1@example.com", "mfauser1");

		// 1. Enroll: request a secret + QR code.
		const setupRes = await request(app).post("/api/auth/mfa/setup").set("Authorization", `Bearer ${token}`);
		expect(setupRes.status).toBe(200);
		const { secret, qrCodeDataUrl } = setupRes.body.data;
		expect(secret).toBeTruthy();
		expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

		// 2. Confirm enrollment with a real TOTP code generated from that secret.
		const codeForSetup = authenticator.generate(secret);
		const confirmRes = await request(app)
			.post("/api/auth/mfa/verify-setup")
			.set("Authorization", `Bearer ${token}`)
			.send({ code: codeForSetup });
		expect(confirmRes.status).toBe(200);

		// 3. Logging in now must stop at the MFA step, not issue a real session.
		const loginAgain = await request(app)
			.post("/api/auth/login")
			.send({ email: "mfauser1@example.com", password: "Str0ng!Passw0rd" });
		expect(loginAgain.status).toBe(200);
		expect(loginAgain.body.mfaRequired).toBe(true);
		expect(loginAgain.body.token).toBeUndefined();
		const { mfaToken } = loginAgain.body;
		expect(mfaToken).toBeTruthy();

		// 4. Wrong code is rejected.
		const badVerify = await request(app).post("/api/auth/mfa/login-verify").send({ mfaToken, code: "000000" });
		expect(badVerify.status).toBe(401);

		// 5. Correct code completes login and issues a real session.
		const goodCode = authenticator.generate(secret);
		const goodVerify = await request(app).post("/api/auth/mfa/login-verify").send({ mfaToken, code: goodCode });
		expect(goodVerify.status).toBe(200);
		expect(goodVerify.body.token).toBeTruthy();
		const setCookie = goodVerify.headers["set-cookie"] as unknown as string[];
		expect(setCookie.some((c) => c.startsWith("access_token="))).toBe(true);

		// 6. Disabling requires a fresh valid code, not just the session.
		const newToken = goodVerify.body.token;
		const disableCode = authenticator.generate(secret);
		const disableRes = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${newToken}`)
			.send({ code: disableCode });
		expect(disableRes.status).toBe(200);

		// 7. Login no longer requires MFA.
		const finalLogin = await request(app)
			.post("/api/auth/login")
			.send({ email: "mfauser1@example.com", password: "Str0ng!Passw0rd" });
		expect(finalLogin.status).toBe(200);
		expect(finalLogin.body.mfaRequired).toBeUndefined();
		expect(finalLogin.body.token).toBeTruthy();
	});

	it("never persists the plaintext TOTP secret in the database", async () => {
		const token = await registerAndLogin("mfauser3@example.com", "mfauser3");

		const setupRes = await request(app).post("/api/auth/mfa/setup").set("Authorization", `Bearer ${token}`);
		const { secret } = setupRes.body.data;

		// mfaTempSecret, read straight off the raw document (bypassing the
		// toJSON transform that strips it from API responses), must be the
		// encrypted form - not the plaintext secret handed to the client.
		const afterSetup = await UserModel.findOne({ email: "mfauser3@example.com" });
		expect(afterSetup?.mfaTempSecret).toBeTruthy();
		expect(afterSetup?.mfaTempSecret).not.toBe(secret);
		expect(decryptMfaSecret(afterSetup!.mfaTempSecret!)).toBe(secret);

		const codeForSetup = authenticator.generate(secret);
		await request(app)
			.post("/api/auth/mfa/verify-setup")
			.set("Authorization", `Bearer ${token}`)
			.send({ code: codeForSetup });

		const afterConfirm = await UserModel.findOne({ email: "mfauser3@example.com" });
		expect(afterConfirm?.mfaSecret).toBeTruthy();
		expect(afterConfirm?.mfaSecret).not.toBe(secret);
		expect(decryptMfaSecret(afterConfirm!.mfaSecret!)).toBe(secret);

		// A code generated from the still-valid secret keeps working after a
		// full encrypt -> store -> decrypt -> verify round trip via login.
		const login = await request(app)
			.post("/api/auth/login")
			.send({ email: "mfauser3@example.com", password: "Str0ng!Passw0rd" });
		const goodCode = authenticator.generate(secret);
		const verify = await request(app)
			.post("/api/auth/mfa/login-verify")
			.send({ mfaToken: login.body.mfaToken, code: goodCode });
		expect(verify.status).toBe(200);
	});

	it("rejects mfa/verify-setup with an invalid code and does not enable MFA", async () => {
		const token = await registerAndLogin("mfauser2@example.com", "mfauser2");
		const setupRes = await request(app).post("/api/auth/mfa/setup").set("Authorization", `Bearer ${token}`);
		const confirmRes = await request(app)
			.post("/api/auth/mfa/verify-setup")
			.set("Authorization", `Bearer ${token}`)
			.send({ code: "000000" });
		expect(confirmRes.status).toBe(400);

		// MFA was never actually enabled, so a normal login still succeeds without it.
		const login = await request(app).post("/api/auth/login").send({ email: "mfauser2@example.com", password: "Str0ng!Passw0rd" });
		expect(login.status).toBe(200);
		expect(login.body.mfaRequired).toBeUndefined();
	});

	it("rejects an expired/garbage mfaToken on login-verify", async () => {
		const res = await request(app).post("/api/auth/mfa/login-verify").send({ mfaToken: "not-a-real-token", code: "123456" });
		expect(res.status).toBe(401);
	});
});
