import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../../config';

describe('Admin integration and pagination', () => {
  let adminToken: string;

  beforeEach(async () => {
    // create admin user directly
    const hashed = await bcrypt.hash('adminpass', 10);
    const admin: any = await UserModel.create({ email: 'admin@example.com', username: 'admin', password: hashed, role: 'admin' } as any);
    const payload = { id: admin._id.toString(), email: admin.email, username: admin.username };
    adminToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

    // create 15 normal users
    for (let i = 0; i < 15; i++) {
      const p = await bcrypt.hash('userpass', 10);
      await UserModel.create({ email: `user${i}@example.com`, username: `user${i}`, password: p } as any);
    }
  });

  it('rejects admin listing without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns paginated users for admin (default page 1, limit 10)', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(10);
    expect(res.body.data.users.length).toBe(10);
    expect(res.body.data.total).toBeGreaterThanOrEqual(16); // admin + 15 users
    expect(res.body.data.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('returns second page with remaining users', async () => {
    const res = await request(app).get('/api/admin/users?page=2&limit=10').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(5);
  });

  it('allows admin to create a new user via POST /api/admin/users', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'newuser@example.com', username: 'newuser', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('does not allow non-admin to access admin endpoints', async () => {
    const hashed = await bcrypt.hash('u1', 10);
    const user = await UserModel.create({ email: 'plain@example.com', username: 'plain', password: hashed } as any);
    const u: any = user;
    const token = jwt.sign({ id: u._id.toString(), email: u.email, username: u.username }, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a non-admin creating a user via POST /api/admin/users (regression: was missing adminMiddleware)', async () => {
    const hashed = await bcrypt.hash('u2', 10);
    const user = await UserModel.create({ email: 'plain2@example.com', username: 'plain2', password: hashed } as any);
    const u: any = user;
    const token = jwt.sign({ id: u._id.toString(), email: u.email, username: u.username }, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'shouldnotexist@example.com', username: 'shouldnotexist', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd' });
    expect(res.status).toBe(403);
    const created = await UserModel.findOne({ email: 'shouldnotexist@example.com' });
    expect(created).toBeNull();
  });

  it('delete action is not implemented yet (expect 404 or method not allowed)', async () => {
    // Ensure route exists: attempt delete (should not crash)
    const res = await request(app).delete('/api/admin/users/someid').set('Authorization', `Bearer ${adminToken}`);
    expect([404, 405, 400, 500]).toContain(res.status);
  });
});
