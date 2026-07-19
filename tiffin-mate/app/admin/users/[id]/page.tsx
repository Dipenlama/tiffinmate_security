"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchUserById } from '@/lib/api';
import { hasSessionMarker } from '@/lib/session-markers';

export default function UserDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const [user, setUser] = useState<any>(null);
  // Real authorization is the backend's httpOnly session cookie; this is
  // only a UX shortcut (see lib/session-markers.ts).
  const token = hasSessionMarker() ? 'session' : '';
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    if (!token) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    fetchUserById(token, id).then((j) => setUser(j.data || j)).catch(() => setUser(null));
  }, [id]);

  if (!id) return <div className="p-6">Missing id</div>;

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="mb-4 px-3 py-1 border rounded">Back</button>
      {!user && <p>No user or not found.</p>}
      {user && (
        <div>
          <h2 className="text-xl font-semibold">{user.username}</h2>
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="mt-2">Role: {user.role}</p>
          <p className="mt-2">Created: {new Date(user.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
