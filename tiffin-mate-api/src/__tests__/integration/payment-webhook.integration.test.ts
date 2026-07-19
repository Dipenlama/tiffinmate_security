import request from "supertest";
import crypto from "crypto";
import app from "../../app";
import { BookingModel } from "../../models/booking.model";
import { PaymentModel } from "../../models/payment.model";

// Regression test for a real bug found during a security review: the Stripe
// webhook route used to be reachable only via a router mounted AFTER the
// global bodyParser.json() middleware, so by the time Stripe's SDK tried to
// verify the signature, the body had already been consumed and JSON-parsed -
// `constructEvent` needs the exact raw bytes that were signed, so
// verification failed unconditionally, on every call, valid signature or
// not. Confirmed empirically before fixing app.ts to register this route
// with its own express.raw() parser ahead of the global one.
function buildStripeSignatureHeader(payload: string, secret: string): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const signedPayload = `${timestamp}.${payload}`;
	const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
	return `t=${timestamp},v1=${signature}`;
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

describe("Stripe payment webhook", () => {
	it("accepts a validly-signed checkout.session.completed event and marks the booking paid", async () => {
		const booking = await BookingModel.create({
			items: [{ id: "i1", name: "Thali", qty: 1, price: 10, subtotal: 10 }],
			total: 10,
			day: "monday",
			time: "12:00",
			frequency: "once",
		});
		const payment = await PaymentModel.create({
			bookingId: booking._id,
			amount: 10,
			currency: "INR",
			status: "processing",
			provider: "stripe",
			providerSessionId: "cs_test_123",
		});

		const payloadObj = {
			id: "evt_test",
			type: "checkout.session.completed",
			data: {
				object: { id: "cs_test_123", metadata: { bookingId: booking._id.toString() } },
			},
		};
		const payload = JSON.stringify(payloadObj);
		const sigHeader = buildStripeSignatureHeader(payload, WEBHOOK_SECRET);

		const res = await request(app)
			.post("/api/payments/webhook")
			.set("Content-Type", "application/json")
			.set("Stripe-Signature", sigHeader)
			.send(payload);

		expect(res.status).toBe(200);
		expect(res.body.received).toBe(true);

		const updatedBooking = await BookingModel.findById(booking._id);
		expect(updatedBooking?.paymentStatus).toBe("paid");
		const updatedPayment = await PaymentModel.findById(payment._id);
		expect(updatedPayment?.status).toBe("succeeded");
	});

	it("rejects a request with an invalid signature", async () => {
		const payload = JSON.stringify({ id: "evt_bad", type: "checkout.session.completed", data: { object: {} } });
		const res = await request(app)
			.post("/api/payments/webhook")
			.set("Content-Type", "application/json")
			.set("Stripe-Signature", "t=1,v1=deadbeef")
			.send(payload);

		expect(res.status).toBe(400);
	});

	it("rejects a tampered payload even with a signature computed for the original body", async () => {
		const originalPayload = JSON.stringify({ id: "evt_x", type: "checkout.session.completed", data: { object: {} } });
		const sigHeader = buildStripeSignatureHeader(originalPayload, WEBHOOK_SECRET);
		const tamperedPayload = JSON.stringify({ id: "evt_x", type: "checkout.session.completed", data: { object: { tampered: true } } });

		const res = await request(app)
			.post("/api/payments/webhook")
			.set("Content-Type", "application/json")
			.set("Stripe-Signature", sigHeader)
			.send(tamperedPayload);

		expect(res.status).toBe(400);
	});

	it("rejects a body larger than the configured limit before ever attempting signature verification", async () => {
		// Regression test for a DoS gap: without an explicit `limit` on the raw
		// body parser, an unauthenticated caller who doesn't know
		// STRIPE_WEBHOOK_SECRET could still force the server to buffer an
		// arbitrarily large request body in memory before signature
		// verification gets a chance to reject it (see app.ts).
		const oversizedPayload = JSON.stringify({
			id: "evt_big",
			type: "checkout.session.completed",
			data: { object: { padding: "x".repeat(2 * 1024 * 1024) } }, // 2mb > the 1mb limit
		});
		const sigHeader = buildStripeSignatureHeader(oversizedPayload, WEBHOOK_SECRET);

		const res = await request(app)
			.post("/api/payments/webhook")
			.set("Content-Type", "application/json")
			.set("Stripe-Signature", sigHeader)
			.send(oversizedPayload);

		expect(res.status).toBe(413);
	});
});
