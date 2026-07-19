import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import bcrypt from "bcryptjs";

describe("CSRF protection", () => {
	it("issues a csrf token and cookie from GET /api/auth/csrf-token", async () => {
		const res = await request(app).get("/api/auth/csrf-token");
		expect(res.status).toBe(200);
		expect(res.body.csrfToken).toBeTruthy();
		const setCookie = res.headers["set-cookie"] as unknown as string[];
		expect(setCookie.some((c) => c.startsWith("csrf_token="))).toBe(true);
	});

	it("blocks a cookie-authenticated mutating request with no CSRF token", async () => {
		const password = await bcrypt.hash("Str0ng!Passw0rd", 10);
		await UserModel.create({ email: "csrf1@example.com", username: "csrf1", password });

		const agent = request.agent(app);
		const login = await agent
			.post("/api/auth/login")
			.send({ email: "csrf1@example.com", password: "Str0ng!Passw0rd" });
		expect(login.status).toBe(200);

		// The agent now carries the access_token cookie from login but has never
		// fetched a CSRF token, so a mutating request must be rejected.
		const res = await agent.post("/api/auth/logout").send();
		expect(res.status).toBe(403);
	});

	it("allows a cookie-authenticated mutating request with a matching CSRF token", async () => {
		const password = await bcrypt.hash("Str0ng!Passw0rd", 10);
		await UserModel.create({ email: "csrf2@example.com", username: "csrf2", password });

		const agent = request.agent(app);
		await agent.post("/api/auth/login").send({ email: "csrf2@example.com", password: "Str0ng!Passw0rd" });

		const csrfRes = await agent.get("/api/auth/csrf-token");
		const csrfToken = csrfRes.body.csrfToken;

		const res = await agent.post("/api/auth/logout").set("X-CSRF-Token", csrfToken).send();
		expect(res.status).toBe(200);
	});

	it("does not require a CSRF token for Bearer-token authenticated mutating requests", async () => {
		// Existing API-client style requests (no cookies at all) must keep working
		// even for POST/PUT/DELETE - they are not vulnerable to CSRF in the first
		// place, so a garbage token must fail as an auth error (401), never a
		// CSRF failure (403).
		const res = await request(app)
			.post("/api/admin/users")
			.set("Authorization", "Bearer not-a-real-token")
			.send({ email: "x@example.com", username: "x", password: "Str0ng!Passw0rd", confirmPassword: "Str0ng!Passw0rd" });
		expect(res.status).toBe(401);
	});
});
