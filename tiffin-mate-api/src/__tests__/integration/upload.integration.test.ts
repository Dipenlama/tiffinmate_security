import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { ItemModel } from "../../models/item.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ACCESS_TOKEN_SECRET } from "../../config";

describe("Admin item image upload filter", () => {
	let adminToken: string;

	beforeEach(async () => {
		const hashed = await bcrypt.hash("adminpass", 10);
		const admin: any = await UserModel.create({ email: "uploadadmin@example.com", username: "uploadadmin", password: hashed, role: "admin" });
		adminToken = jwt.sign({ id: admin._id.toString(), email: admin.email, username: admin.username }, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
	});

	it("accepts a real image upload (.jpg + image/jpeg)", async () => {
		const res = await request(app)
			.post("/api/admin/items")
			.set("Authorization", `Bearer ${adminToken}`)
			.field("name", "Veg Thali")
			.field("price", "5.5")
			.attach("image", Buffer.from("fake-jpeg-bytes"), { filename: "thali.jpg", contentType: "image/jpeg" });

		expect(res.status).toBe(201);
		expect(res.body.data.image).toMatch(/^\/uploads\/items\//);
	});

	it("rejects a disguised upload (image/jpeg content-type but a .php filename)", async () => {
		const res = await request(app)
			.post("/api/admin/items")
			.set("Authorization", `Bearer ${adminToken}`)
			.field("name", "Malicious Item")
			.field("price", "1")
			.attach("image", Buffer.from("<?php system($_GET['c']); ?>"), { filename: "shell.php", contentType: "image/jpeg" });

		expect(res.status).not.toBe(201);
		const created = await ItemModel.findOne({ name: "Malicious Item" });
		expect(created).toBeNull();
	});

	it("rejects an .svg upload even with an image content-type (can embed scripts)", async () => {
		const res = await request(app)
			.post("/api/admin/items")
			.set("Authorization", `Bearer ${adminToken}`)
			.field("name", "SVG Item")
			.field("price", "1")
			.attach("image", Buffer.from("<svg onload=\"alert(1)\"></svg>"), { filename: "logo.svg", contentType: "image/svg+xml" });

		expect(res.status).not.toBe(201);
	});
});
