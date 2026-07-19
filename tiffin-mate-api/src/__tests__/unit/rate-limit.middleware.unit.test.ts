import express from "express";
import request from "supertest";
import { loginLimiter } from "../../middlewares/rate-limit.middleware";

describe("loginLimiter", () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	it("is skipped under NODE_ENV=test (so the integration suite isn't rate-limited)", async () => {
		process.env.NODE_ENV = "test";
		const app = express();
		app.post("/login", loginLimiter, (_req, res) => res.json({ ok: true }));

		for (let i = 0; i < 12; i++) {
			const res = await request(app).post("/login");
			expect(res.status).toBe(200);
		}
	});

	it("blocks requests past the configured threshold when enforcement is active", async () => {
		process.env.NODE_ENV = "production";
		const app = express();
		app.post("/login", loginLimiter, (_req, res) => res.json({ ok: true }));

		let lastStatus = 0;
		for (let i = 0; i < 11; i++) {
			const res = await request(app).post("/login");
			lastStatus = res.status;
		}
		expect(lastStatus).toBe(429);
	});
});
