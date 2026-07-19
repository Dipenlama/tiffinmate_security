import express from "express";
import request from "supertest";

// captcha.middleware reads CAPTCHA_SECRET_KEY from ../config at import time,
// so each "enabled" scenario needs a fresh module registry with the env
// var already set before the import happens.
async function loadMiddlewareWithCaptchaKey(secretKey: string | undefined) {
	jest.resetModules();
	const originalKey = process.env.CAPTCHA_SECRET_KEY;
	if (secretKey === undefined) {
		delete process.env.CAPTCHA_SECRET_KEY;
	} else {
		process.env.CAPTCHA_SECRET_KEY = secretKey;
	}
	const mod = await import("../../middlewares/captcha.middleware");
	if (originalKey === undefined) {
		delete process.env.CAPTCHA_SECRET_KEY;
	} else {
		process.env.CAPTCHA_SECRET_KEY = originalKey;
	}
	return mod.verifyCaptcha;
}

function buildApp(verifyCaptcha: express.RequestHandler) {
	const app = express();
	app.use(express.json());
	app.post("/protected", verifyCaptcha, (_req, res) => res.status(200).json({ ok: true }));
	return app;
}

describe("verifyCaptcha middleware", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("skips verification when CAPTCHA_SECRET_KEY is not configured (dev/test default)", async () => {
		const verifyCaptcha = await loadMiddlewareWithCaptchaKey(undefined);
		const app = buildApp(verifyCaptcha);
		const res = await request(app).post("/protected").send({});
		expect(res.status).toBe(200);
	});

	it("rejects a request with no captcha token once a secret key is configured", async () => {
		const verifyCaptcha = await loadMiddlewareWithCaptchaKey("test-secret");
		const app = buildApp(verifyCaptcha);
		const res = await request(app).post("/protected").send({});
		expect(res.status).toBe(400);
	});

	it("accepts a request when the provider confirms the token is valid", async () => {
		const verifyCaptcha = await loadMiddlewareWithCaptchaKey("test-secret");
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({ success: true }),
		}) as any;
		const app = buildApp(verifyCaptcha);
		const res = await request(app).post("/protected").send({ captchaToken: "valid-token" });
		expect(res.status).toBe(200);
		expect(global.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: "POST" })
		);
	});

	it("rejects a request when the provider reports the token as invalid", async () => {
		const verifyCaptcha = await loadMiddlewareWithCaptchaKey("test-secret");
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({ success: false }),
		}) as any;
		const app = buildApp(verifyCaptcha);
		const res = await request(app).post("/protected").send({ captchaToken: "bad-token" });
		expect(res.status).toBe(400);
	});

	it("fails closed (503) rather than letting the request through when the provider is unreachable", async () => {
		const verifyCaptcha = await loadMiddlewareWithCaptchaKey("test-secret");
		global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;
		const app = buildApp(verifyCaptcha);
		const res = await request(app).post("/protected").send({ captchaToken: "valid-token" });
		expect(res.status).toBe(503);
	});
});
