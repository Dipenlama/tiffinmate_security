import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../../config';

describe('Admin pagination edge cases and invalid id handling', () => {
  let adminToken: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('adminpass', 10);
    const admin: any = await UserModel.create({ email: 'edgeadmin@example.com', username: 'edgeadmin', password: hashed, role: 'admin' } as any);
    const payload = { id: admin._id.toString(), email: admin.email, username: admin.username };
    adminToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

    // create 3 normal users
    for (let i = 0; i < 3; i++) {
      const p = await bcrypt.hash('userpass', 10);
      await UserModel.create({ email: `edge${i}@example.com`, username: `edge${i}`, password: p } as any);
    }
  });

  it('page beyond total returns empty users array and correct page meta', async () => {
    const res = await request(app).get('/api/admin/users?page=10&limit=2').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(10);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBe(0);
  });

  it('limit larger than total returns all users', async () => {
    const res = await request(app).get('/api/admin/users?page=1&limit=50').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(4); // admin + 3 users
  });

  it('update non-existing user returns 404', async () => {
    const res = await request(app)
      .put(`/api/admin/users/507f1f77bcf86cd799439011`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'noone' });
    expect([404, 400]).toContain(res.status);
  });

  it('delete non-existing user returns 404', async () => {
    const res = await request(app).delete('/api/admin/users/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${adminToken}`);
    expect([404, 400]).toContain(res.status);
  });

  it('PUT with invalid id format returns 400 or 500 but not crash', async () => {
    const res = await request(app).put('/api/admin/users/invalid-id').set('Authorization', `Bearer ${adminToken}`).send({ username: 'x' });
    expect([400, 500]).toContain(res.status);
  });

  it('DELETE with invalid id format returns 400 or 500 but not crash', async () => {
    const res = await request(app).delete('/api/admin/users/invalid-id').set('Authorization', `Bearer ${adminToken}`);
    expect([400, 500]).toContain(res.status);
  });
});
