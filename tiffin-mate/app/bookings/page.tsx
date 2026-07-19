"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "../../lib/api";
import { hasSessionMarker } from "../../lib/session-markers";

type Booking = {
  _id: string;
  package: string;
  packageName?: string;
  day?: string;
  time?: string;
  address?: string;
  items?: Array<{ id?: string; name?: string; qty?: number; price?: number; subtotal?: number }>;
  total?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PageData = {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Real authorization is the backend's httpOnly session cookie, sent via
// `credentials: 'include'` below; this is only a UX shortcut to decide
// whether to bother fetching at all before the backend would 401 anyway
// (see lib/session-markers.ts).
function getToken(): string | null {
  return hasSessionMarker() ? "session" : null;
}

function getUser(): { _id?: string; role?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

// useSearchParams() opts the whole page out of static prerendering unless
// its usage is wrapped in a Suspense boundary - `next build` fails to
// prerender this route otherwise (see
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageInner />
    </Suspense>
  );
}

function BookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useMemo(() => getUser(), []);
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam || currentUser?._id || "";

  const forbidden = useMemo(() => {
    if (!userId) return false;
    if (!currentUser) return false; // if we cannot tell, allow fetch and let server handle
    if (currentUser.role === "admin") return false;
    return currentUser._id !== userId;
  }, [currentUser, userId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent("/bookings")}`);
      return;
    }
    if (!userId) {
      setError("Missing userId");
      setLoading(false);
      return;
    }
    if (forbidden) {
      setError("Forbidden: you cannot view another user's bookings.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/bookings/user/${encodeURIComponent(userId)}?page=${page}&limit=${limit}`,
          { credentials: "include", signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) {
          if (res.status === 401 || res.status === 403) {
            setError("Unauthorized. Please login again.");
            return;
          }
          setError(json?.error?.message || json?.message || "Failed to load bookings");
          return;
        }
        const payload: PageData = json.data || { items: [], total: 0, page, limit, totalPages: 1 };
        setData(payload);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => controller.abort();
  }, [page, limit, userId, router, forbidden]);

  const onRetry = () => {
    setError(null);
    setPage(1);
    setLimit(10);
    setLoading(true);
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Your bookings</p>
            <h1 className="text-2xl font-semibold text-neutral-900">Bookings</h1>
          </div>
          <div className="text-sm text-neutral-500">User: {userId || 'unknown'}</div>
        </header>

        {forbidden && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6" role="alert">
            Forbidden: you cannot view another user's bookings.
          </div>
        )}

        {error && !loading && !forbidden && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-6" role="alert">
            <div className="font-semibold mb-1">Unable to load bookings</div>
            <div className="text-sm mb-3">{error}</div>
            <button onClick={onRetry} className="px-3 py-2 bg-neutral-900 text-white rounded text-sm">Retry</button>
          </div>
        )}

        {loading && (
          <div className="text-neutral-600">Loading bookings…</div>
        )}

        {!loading && !error && !forbidden && data && data.items.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 text-neutral-600">No bookings yet.</div>
        )}

        {!loading && !error && !forbidden && data && data.items.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-700">
                <tr>
                  <th className="text-left px-4 py-3">Package</th>
                  <th className="text-left px-4 py-3">Day / Time</th>
                  <th className="text-left px-4 py-3">Address</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((bk) => (
                  <tr key={bk._id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{bk.packageName || bk.package || '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">{bk.day || '—'} {bk.time ? `• ${bk.time}` : ''}</td>
                    <td className="px-4 py-3 text-neutral-700 max-w-xs whitespace-pre-wrap">{bk.address || (bk as any)?.meta?.address || '—'}</td>
                    <td className="px-4 py-3 text-neutral-900">₹{Number(bk.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">{bk.status || 'pending'}</span></td>
                    <td className="px-4 py-3 text-neutral-600">{bk.createdAt ? new Date(bk.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-sm text-orange-600 hover:text-orange-700">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
              <div className="text-sm text-neutral-600">Page {data.page} of {data.totalPages} • {data.total} total</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50">
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => (data.totalPages ? Math.min(data.totalPages, p + 1) : p + 1))}
                  disabled={data.totalPages ? page >= data.totalPages : false}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50">
                  Next
                </button>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value) || 10); setPage(1); }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {[5,10,20,50].map((n) => <option key={n} value={n}>{n}/page</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
