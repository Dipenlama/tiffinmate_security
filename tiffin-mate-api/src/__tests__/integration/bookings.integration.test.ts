import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ACCESS_TOKEN_SECRET } from "../../config";
import mongoose from "mongoose";

const buildBookingPayload = (overrides: any = {}) => ({
	draftId: `draft-${Date.now()}`,
	items: [
		{ id: "item1", name: "Item 1", qty: 2, price: 5, subtotal: 10 },
	],
	total: 10,
	day: "monday",
	time: "12:00",
	frequency: "once",
	package: "basic",
	packageName: "Basic Plan",
	address: "123 Street",
	notes: "no spice",
	...overrides,
});

async function createUserAndToken(role: "user" | "admin" = "user") {
	const password = await bcrypt.hash("password123", 10);
	const user = await UserModel.create({
		email: `user+${Date.now()}@example.com`,
		username: `user${Date.now()}`,
		password,
		role,
	});
	const token = jwt.sign(
		{ id: user._id, email: user.email, username: user.username },
		ACCESS_TOKEN_SECRET,
		{ expiresIn: "1h" }
	);
	return { user, token };
}

async function createBooking(token: string, payloadOverrides: any = {}) {
	const res = await request(app)
		.post("/api/bookings")
		.set("Authorization", `Bearer ${token}`)
		.send(buildBookingPayload(payloadOverrides));
	return res;
}

describe("Bookings integration", () => {
	it("rejects booking creation without auth header", async () => {
		const res = await request(app).post("/api/bookings").send(buildBookingPayload());
		expect(res.status).toBe(401);
	});

	it("rejects listing bookings without token", async () => {
		const res = await request(app).get("/api/bookings");
		expect(res.status).toBe(401);
	});

	it("rejects get booking by id without token", async () => {
		const res = await request(app).get("/api/bookings/123");
		expect([401, 400, 500]).toContain(res.status);
	});

	it("creates a booking with valid token and payload", async () => {
		const { token } = await createUserAndToken();

		const res = await createBooking(token);

		expect(res.status).toBe(201);
		expect(res.body.success).toBe(true);
		expect(res.body.data.total).toBe(10);
	});

	it("rejects booking creation when items array is missing", async () => {
		const { token } = await createUserAndToken();

		const res = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.send({ total: 0, day: "mon", time: "9am", frequency: "once" });

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
	});

	it("rejects booking when item quantity is invalid", async () => {
		const { token } = await createUserAndToken();
		const payload = buildBookingPayload({
			items: [{ id: "item1", name: "Item 1", qty: 0, price: 5, subtotal: 0 }],
			total: 0,
		});

		const res = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.send(payload);

		expect(res.status).toBe(400);
	});

	it("lists bookings for the authenticated user", async () => {
		const { token } = await createUserAndToken();
		await createBooking(token);

		const res = await request(app)
			.get("/api/bookings")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.total).toBe(1);
		expect(res.body.data.items.length).toBe(1);
	});

	it("retrieves a booking by id for the owner", async () => {
		const { token } = await createUserAndToken();
		const createRes = await createBooking(token);
		const bookingId = createRes.body.data._id;

		const res = await request(app)
			.get(`/api/bookings/${bookingId}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data._id).toBe(bookingId);
	});

	it("returns 403 when another user tries to access the booking", async () => {
		const { token: ownerToken } = await createUserAndToken();
		const { token: otherToken } = await createUserAndToken();
		const createRes = await createBooking(ownerToken);
		const bookingId = createRes.body.data._id;

		const res = await request(app)
			.get(`/api/bookings/${bookingId}`)
			.set("Authorization", `Bearer ${otherToken}`);

		expect(res.status).toBe(403);
	});

	it("allows admin to view any booking", async () => {
		const { token: userToken } = await createUserAndToken();
		const createRes = await createBooking(userToken);
		const bookingId = createRes.body.data._id;
		const { token: adminToken } = await createUserAndToken("admin");

		const res = await request(app)
			.get(`/api/bookings/${bookingId}`)
			.set("Authorization", `Bearer ${adminToken}`);

		expect(res.status).toBe(200);
		expect(res.body.data._id).toBe(bookingId);
	});

	it("allows owner to cancel booking via delete", async () => {
		const { token } = await createUserAndToken();
		const createRes = await createBooking(token);
		const bookingId = createRes.body.data._id;

		const res = await request(app)
			.delete(`/api/bookings/${bookingId}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.status).toBe("cancelled");
	});

	it("returns 404 when deleting a non-existing booking", async () => {
		const { token } = await createUserAndToken();
		const missingId = new mongoose.Types.ObjectId().toString();

		const res = await request(app)
			.delete(`/api/bookings/${missingId}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(404);
	});

	it("lists all bookings for admin", async () => {
		const { token: userToken } = await createUserAndToken();
		await createBooking(userToken);
		await createBooking(userToken, { draftId: `draft-${Date.now()}-2` });
		const { token: adminToken } = await createUserAndToken("admin");

		const res = await request(app)
			.get("/api/bookings")
			.set("Authorization", `Bearer ${adminToken}`);

		expect(res.status).toBe(200);
		expect(res.body.data.total).toBeGreaterThanOrEqual(2);
		expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
	});

	it("returns 403 when non-admin lists another user bookings", async () => {
		const { user, token } = await createUserAndToken();
		const { token: other } = await createUserAndToken();
		await createBooking(token);

		const res = await request(app)
			.get(`/api/bookings/user/${user._id}`)
			.set("Authorization", `Bearer ${other}`);

		expect(res.status).toBe(403);
	});

	it("allows admin to list another user bookings", async () => {
		const { user, token } = await createUserAndToken();
		await createBooking(token);
		const { token: admin } = await createUserAndToken("admin");

		const res = await request(app)
			.get(`/api/bookings/user/${user._id}`)
			.set("Authorization", `Bearer ${admin}`);

		expect(res.status).toBe(200);
		expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
	});

	it("accepts booking even when total does not match subtotals (current behavior)", async () => {
		const { token } = await createUserAndToken();
		const payload = buildBookingPayload({ total: 999 });

		const res = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.send(payload);

		expect(res.status).toBe(201);
	});

	it("creates two bookings even with the same idempotency-key (current behavior)", async () => {
		const { token } = await createUserAndToken();
		const key = "dup-key";
		const payload = buildBookingPayload();

		const first = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.set("idempotency-key", key)
			.send(payload);
		expect(first.status).toBe(201);

		const second = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.set("idempotency-key", key)
			.send(payload);

		expect(second.status).toBe(201);
		expect(second.body.data._id).not.toBe(first.body.data._id);
	});

	it("ignores status query (no filtering implemented) and still returns 200", async () => {
		const { token } = await createUserAndToken();
		await createBooking(token);
		const res = await request(app)
			.get("/api/bookings")
			.query({ status: "pending" })
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
	});

	it("normalizes frequency synonyms on create", async () => {
		const { token } = await createUserAndToken();
		const payload = buildBookingPayload({ frequency: "One Time" });
		const res = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.send(payload);

		expect(res.status).toBe(201);
		expect(res.body.data.frequency).toBe("once");
	});

	it("accepts booking when subtotal mismatch to total (current behavior)", async () => {
		const { token } = await createUserAndToken();
		const payload = buildBookingPayload({
			items: [{ id: "x", name: "X", qty: 1, price: 5, subtotal: 5 }],
			total: 3,
		});

		const res = await request(app)
			.post("/api/bookings")
			.set("Authorization", `Bearer ${token}`)
			.send(payload);

		expect(res.status).toBe(201);
	});

	it("allows admin to delete any booking", async () => {
		const { token: owner } = await createUserAndToken();
		const createRes = await createBooking(owner);
		const bookingId = createRes.body.data._id;
		const { token: admin } = await createUserAndToken("admin");

		const res = await request(app)
			.delete(`/api/bookings/${bookingId}`)
			.set("Authorization", `Bearer ${admin}`);

		expect(res.status).toBe(200);
	});

	it("returns 404 when getting non-existing booking id", async () => {
		const { token } = await createUserAndToken();
		const missingId = new mongoose.Types.ObjectId().toString();

		const res = await request(app)
			.get(`/api/bookings/${missingId}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(404);
	});

	it("paginates bookings for user", async () => {
		const { token } = await createUserAndToken();
		await createBooking(token, { draftId: `d1-${Date.now()}` });
		await createBooking(token, { draftId: `d2-${Date.now()}` });
		await createBooking(token, { draftId: `d3-${Date.now()}` });

		const res = await request(app)
			.get("/api/bookings")
			.query({ page: 2, limit: 2 })
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.page).toBe(2);
		expect(res.body.data.items.length).toBeLessThanOrEqual(2);
	});

	it("supports alias /api/booking for creation", async () => {
		const { token } = await createUserAndToken();

		const res = await request(app)
			.post("/api/booking")
			.set("Authorization", `Bearer ${token}`)
			.send(buildBookingPayload({ draftId: `alias-${Date.now()}` }));

		expect(res.status).toBe(201);
	});
	it("filters bookings by user via /user/:userId", async () => {
		const { user, token } = await createUserAndToken();
		await createBooking(token);

		const res = await request(app)
			.get(`/api/bookings/user/${user._id}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.items.length).toBe(1);
	});
});
