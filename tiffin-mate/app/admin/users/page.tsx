"use client";

import React, { useEffect, useState } from 'react';
import { fetchAdminUsers, deleteAdminUser, getCsrfToken, API_BASE } from '../../../lib/api';
import { hasSessionMarker } from '../../../lib/session-markers';

export default function AdminUsersPage() {
  const [usersData, setUsersData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
  // Real authorization is via the backend's httpOnly session cookie
  // (credentials: 'include' below); this only checks the non-secret
  // `logged_in` marker cookie set at login to decide whether to bother
  // rendering the page at all (see lib/session-markers.ts).
  const token = hasSessionMarker() ? 'session' : '';

  useEffect(() => {
    if (!token) {
      // redirect to login when unauthenticated
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    load();
  }, [page]);

  async function load() {
    setLoading(true);
    try {
      const resp = await fetchAdminUsers(token, page, 10);
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }
        setUsersData(null);
        return;
      }
      const json = resp.data;
      setUsersData(json.data || json);
    } catch (e) {
      setUsersData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!token) {
      alert('Not authenticated');
      return;
    }
    const trimmedPassword = userForm.password.trim();
    const trimmedConfirm = (userForm.confirmPassword || '').trim();
    if (!trimmedPassword || trimmedPassword !== trimmedConfirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      const payload = {
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        password: trimmedPassword,
        confirmPassword: trimmedConfirm || trimmedPassword,
        role: userForm.role === 'admin' ? 'admin' : 'user',
      };
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.message || 'Failed to create user');
        return;
      }
      setMessage('User created');
      setUserForm({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
      load();
    } catch (e) {
      alert('Failed to create user');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await deleteAdminUser(token, id);
      if (res.ok) {
        setMessage('User deleted');
        setTimeout(() => { setMessage(null); load(); }, 700);
      } else {
        alert('Delete failed');
      }
    } catch (err) {
      alert('Delete failed');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Users</h1>
      <div className="mb-6 border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-3">Create User</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-600">Username</label>
            <input value={userForm.username} onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Email</label>
            <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Password</label>
            <input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Confirm Password</label>
            <input type="password" value={userForm.confirmPassword} onChange={(e) => setUserForm((f) => ({ ...f, confirmPassword: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Role</label>
            <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={handleCreate} className="bg-orange-600 text-white px-4 py-2 rounded text-sm">Create</button>
          <button onClick={() => setUserForm({ username: '', email: '', password: '', confirmPassword: '', role: 'user' })} className="px-4 py-2 rounded border text-sm">Clear</button>
        </div>
      </div>
      {loading && <p>Loading...</p>}
      {!usersData && !loading && <p>No users or access denied.</p>}
      {usersData && (
        <div>
          {message && <div className="mb-3 text-green-700">{message}</div>}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1">Email</th>
                <th className="border px-2 py-1">Username</th>
                <th className="border px-2 py-1">Role</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersData.users.map((u: any) => (
                <tr key={u._id}>
                  <td className="border px-2 py-1">{u.email}</td>
                  <td className="border px-2 py-1">{u.username}</td>
                  <td className="border px-2 py-1">{u.role}</td>
                  <td className="border px-2 py-1">
                    <a href={`/admin/users/${u._id}`} className="mr-2 text-blue-600">View</a>
                    <a href={`/admin/users/${u._id}/edit`} className="mr-2 text-green-600">Edit</a>
                    <button onClick={() => handleDelete(u._id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded">
              Prev
            </button>
            <span className="px-3 py-1">Page {usersData.page} / {usersData.totalPages}</span>
            <button disabled={page >= usersData.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
