import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(60000);

let mongo: MongoMemoryServer;

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
	const uri = mongo.getUri();
	await mongoose.connect(uri);
});

afterAll(async () => {
	await mongoose.disconnect();
	if (mongo) {
		try {
			await mongo.stop();
		} catch (e) {
			// On some environments (Windows) stopping the binary can fail; log and continue
			// Tests still pass because process will exit
			// eslint-disable-next-line no-console
			console.warn('mongodb-memory-server stop failed:', (e as any)?.message ?? e);
		}
	}
});

beforeEach(async () => {
	if (!mongoose.connection.db) return;
	const collections = await mongoose.connection.db.collections();
	for (const collection of collections) {
		await collection.deleteMany({});
	}
});
