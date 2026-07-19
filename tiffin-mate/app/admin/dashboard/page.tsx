"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getCsrfToken } from "../../../lib/api";
import { hasSessionMarker } from "../../../lib/session-markers";

type User = {
    _id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    createdAt?: string;
};

type NewUser = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
};

type Booking = {
    _id: string;
    package?: string;
    packageName?: string;
    day?: string;
    time?: string;
    total?: number;
    status?: string;
    userId?: string;
    createdAt?: string;
};

type MenuItem = {
    _id?: string;
    id?: string;
    title?: string; // legacy
    name?: string;
    description?: string;
    image?: string;
    price?: number;
    category?: string;
    available?: boolean;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050/api").replace(/\/$/, "");
const API_HOST = API_BASE.replace(/\/api$/, "");
const MAX_IMAGE_BYTES = 700 * 1024; // keep below backend 1MB once base64 encoded

// Real authorization now happens via the backend's httpOnly session cookie,
// sent automatically by `credentials: 'include'` below - this function no
// longer returns an actual bearer token (there isn't one for JS to read
// anymore). It returns a truthy placeholder purely so the existing
// `if (!token) return` guards throughout this page still gate correctly on
// "is there a session" via the non-secret `logged_in` marker cookie set by
// login/page.tsx (see lib/session-markers.ts).
function getToken(): string | null {
    return hasSessionMarker() ? "session" : null;
}

async function apiGet(path: string, _token: string) {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json?.data ?? json };
}

async function apiSend(path: string, _token: string, method: string, body?: any) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (method !== "GET") headers["X-CSRF-Token"] = await getCsrfToken();
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json?.data ?? json };
}

type TabKey = "overview" | "users" | "bookings" | "items";

export default function AdminDashboardPage() {
    const [tab, setTab] = useState<TabKey>("overview");
    const [token, setToken] = useState<string | null>(null);

    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState<string | null>(null);

    const [items, setItems] = useState<MenuItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);

    const [itemForm, setItemForm] = useState<MenuItem>({ name: "", description: "", price: 0, category: "veg", available: true, image: "" });
    const [itemImagePreview, setItemImagePreview] = useState<string | undefined>(undefined);
    const [itemImageFile, setItemImageFile] = useState<File | undefined>(undefined);
    const [savingItem, setSavingItem] = useState(false);

    const [userForm, setUserForm] = useState<NewUser>({ username: "", email: "", password: "", confirmPassword: "", role: "user" });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [savingUser, setSavingUser] = useState(false);

    const normalizeBookingStatus = (b: Booking) => {
        const raw = (b.status || (b as any).bookingStatus || (b as any).orderStatus || "pending").toString().toLowerCase();
        const allowed = ["pending", "accepted", "dispatched", "delivered", "cancelled"];
        return allowed.includes(raw) ? raw : "pending";
    };

    const formatINR = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

    useEffect(() => {
        setToken(getToken());
    }, []);

    useEffect(() => {
        if (!token) return;
        loadUsers();
        loadBookings();
        loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const loadUsers = async () => {
        if (!token) return;
        setUsersLoading(true);
        setUsersError(null);
        const res = await apiGet("/admin/users", token);
        if (!res.ok) setUsersError(`Failed to load users (${res.status})`);
        const list = Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.users)
            ? res.data.users
            : Array.isArray(res.data)
            ? res.data
            : [];
        setUsers(list as User[]);
        setUsersLoading(false);
    };

    const startEditUser = (u: User) => {
        setEditingUserId(u._id);
        setUserForm({
            username: u.username || "",
            email: u.email || "",
            password: "",
            confirmPassword: "",
            role: u.role || "user",
        });
        setTab("users");
    };

    const deleteUser = async (id: string) => {
        if (!token) return;
        const ok = confirm("Delete this user?");
        if (!ok) return;
        const res = await apiSend(`/admin/users/${id}`, token, "DELETE");
        if (!res.ok) {
            alert("Failed to delete user");
            return;
        }
        setUsers((u) => u.filter((x) => x._id !== id));
    };

    const loadBookings = async () => {
        if (!token) return;
        setBookingsLoading(true);
        setBookingsError(null);

        const tryPaths = [
            "/admin/bookings?page=1&limit=50",
            "/bookings?page=1&limit=50",
        ];

        let loaded: Booking[] = [];
        let lastError: string | null = null;

        for (const path of tryPaths) {
            const res = await apiGet(path, token);
            if (!res.ok) {
                lastError = `Failed to load bookings (${res.status})`;
                continue;
            }
            const list = Array.isArray(res.data?.items)
                ? res.data.items
                : Array.isArray(res.data?.bookings)
                ? res.data.bookings
                : Array.isArray(res.data)
                ? res.data
                : [];
            loaded = list as Booking[];
            lastError = null;
            break;
        }

        if (lastError) setBookingsError(lastError);
        setBookings(loaded);
        setBookingsLoading(false);
    };

    const updateBookingStatus = async (id: string, status: string) => {
        if (!token) return;
        const res = await apiSend(`/admin/bookings/${id}/status`, token, "PUT", { status });
        if (!res.ok) {
            alert("Failed to update booking");
            return;
        }
        loadBookings();
    };

    const cancelBooking = async (id: string) => {
        if (!token) return;
        const ok = confirm("Cancel this booking?");
        if (!ok) return;
        const res = await apiSend(`/admin/bookings/${id}`, token, "DELETE");
        if (!res.ok) alert("Failed to cancel booking");
        loadBookings();
    };

    const loadItems = async () => {
        if (!token) return;
        setItemsLoading(true);
        setItemsError(null);
        const res = await apiGet("/admin/items?page=1&limit=100", token);
        if (!res.ok) setItemsError(`Failed to load items (${res.status})`);
        const list = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
        setItems(list as MenuItem[]);
        setItemsLoading(false);
    };

    const resolveImageSrc = (img?: string) => {
        if (!img) return "";
        if (img.startsWith("http") || img.startsWith("data:")) return img;
        return `${API_HOST}/${img.replace(/^\/+/, "")}`;
    };

    const saveItem = async () => {
        if (!token) return;
        const name = itemForm.name?.trim() || "";
        const price = Number(itemForm.price) || 0;
        const description = itemForm.description?.trim() || "";
        if (!name) { alert('Name is required'); return; }
        if (price <= 0) { alert('Price must be greater than 0'); return; }

        const imageValue = (itemForm.image || "").trim();
        if (imageValue.startsWith('data:')) {
            alert('Data URI images are not allowed. Please upload a file instead.');
            return;
        }

        setSavingItem(true);
        const path = itemForm._id ? `/admin/items/${itemForm._id}` : "/admin/items";
        const method = itemForm._id ? "PUT" : "POST";

        let res: any;
        if (itemImageFile) {
            const form = new FormData();
            form.append('name', name);
            form.append('description', description);
            form.append('price', String(price));
            form.append('category', itemForm.category || "veg");
            form.append('available', itemForm.available !== false ? 'true' : 'false');
            form.append('image', itemImageFile);
            res = await fetch(`${API_BASE}${path}`, {
                method,
                headers: { "X-CSRF-Token": await getCsrfToken() },
                credentials: "include",
                body: form,
            }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));
        } else {
            const payload = {
                name,
                description,
                image: imageValue || undefined,
                price,
                category: itemForm.category || "veg",
                available: itemForm.available !== false,
            };
            res = await apiSend(path, token, method, payload);
        }

        if (!res.ok) {
            const message = (res.data as any)?.message || (res.data as any)?.error || `Failed to save item (${res.status})`;
            console.error("Save item failed", { status: res.status, data: res.data });
            alert(message);
        } else {
            loadItems();
            setItemForm({ name: "", description: "", price: 0, category: "veg", available: true, image: "" });
            setItemImagePreview(undefined);
            setItemImageFile(undefined);
        }
        setSavingItem(false);
    };

    const editItem = (itm: MenuItem) => {
        setItemForm({
            ...itm,
            name: itm.name || itm.title || itm.id || "",
            description: itm.description || "",
            image: itm.image || "",
            price: itm.price ?? 0,
            category: itm.category || "",
            available: itm.available !== false,
        } as any);
        setItemImagePreview(itm.image);
        setItemImageFile(undefined);
        setTab("items");
    };

    const deleteItem = async (id?: string) => {
        if (!token || !id) return;
        const ok = confirm("Delete this item?");
        if (!ok) return;
        const res = await apiSend(`/admin/items/${id}`, token, "DELETE");
        if (!res.ok) alert("Failed to delete item");
        loadItems();
    };

    const stats = useMemo(() => ({
        users: users.length,
        bookings: bookings.length,
        items: items.length,
    }), [users, bookings, items]);

    const bookingInsights = useMemo(() => {
        const counts: Record<string, number> = { pending: 0, accepted: 0, dispatched: 0, delivered: 0, cancelled: 0 };
        let revenue = 0;

        bookings.forEach((b) => {
            const status = normalizeBookingStatus(b);
            counts[status] = (counts[status] || 0) + 1;
            revenue += Number(b.total || 0);
        });

        const recent = [...bookings]
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 5);

        const cancellationRate = bookings.length ? Math.round((counts.cancelled / bookings.length) * 100) : 0;
        const active = bookings.length - counts.cancelled;

        return { counts, revenue, recent, cancellationRate, active };
    }, [bookings]);

    const bookingTrend = useMemo(() => {
        const today = new Date();
        const days = Array.from({ length: 10 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (9 - i));
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
            const value = bookings.filter((b) => (b.createdAt ? b.createdAt.slice(0, 10) : "") === key).length;
            return { key, label, value };
        });

        const max = Math.max(...days.map((d) => d.value), 0);
        const points = days.map((d, idx) => {
            const x = days.length > 1 ? (idx / (days.length - 1)) * 100 : 0;
            const y = max > 0 ? 100 - (d.value / max) * 100 : 100;
            return { ...d, x, y };
        });

        return { days, points, max };
    }, [bookings]);

    const orangeCard = "bg-gradient-to-r from-orange-500 to-amber-500 text-white";

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-neutral-900">
            <main className="max-w-7xl mx-auto px-6 py-8">
                <header className="mb-8 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-500">Admin Console</p>
                            <h1 className="text-3xl font-bold">Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-600 bg-white border border-neutral-200 px-3 py-2 rounded-full shadow-sm">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-semibold">A</span>
                            <span>Signed in as Admin</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[{ key: "overview", label: "Overview" }, { key: "users", label: "Users" }, { key: "bookings", label: "Bookings" }, { key: "items", label: "Items" }].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key as TabKey)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? orangeCard : "bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50"}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </header>

                {tab === "overview" && (
                    <div className="space-y-6">
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[{ label: "Users", value: stats.users }, { label: "Bookings", value: stats.bookings }, { label: "Menu Items", value: stats.items }].map((s) => (
                                <div key={s.label} className="rounded-xl p-5 shadow-sm bg-white border border-neutral-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-neutral-500">{s.label}</div>
                                        <span className="px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700">Live</span>
                                    </div>
                                    <div className="text-3xl font-bold mt-2 text-neutral-900">{s.value}</div>
                                    <div className="mt-2 h-1 rounded-full bg-orange-100">
                                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (Number(s.value) || 0) * 5)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-neutral-500">Health</p>
                                        <h3 className="text-lg font-semibold text-neutral-900">Operational Snapshot</h3>
                                    </div>
                                    <span className="text-xs text-neutral-500">Auto-refresh on load</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
                                    {[{
                                        label: "Pending",
                                        value: bookingInsights.counts.pending,
                                        tone: "bg-amber-50 text-amber-700",
                                    }, {
                                        label: "Dispatched",
                                        value: bookingInsights.counts.dispatched,
                                        tone: "bg-blue-50 text-blue-700",
                                    }, {
                                        label: "Delivered",
                                        value: bookingInsights.counts.delivered,
                                        tone: "bg-emerald-50 text-emerald-700",
                                    }, {
                                        label: "Active Bookings",
                                        value: bookingInsights.active,
                                        tone: "bg-orange-50 text-orange-700",
                                    }, {
                                        label: "Cancelled",
                                        value: bookingInsights.counts.cancelled,
                                        tone: "bg-rose-50 text-rose-700",
                                    }, {
                                        label: "Cancellation Rate",
                                        value: `${bookingInsights.cancellationRate}%`,
                                        tone: "bg-neutral-50 text-neutral-700",
                                    }].map((card) => (
                                        <div key={card.label} className={`rounded-lg border border-neutral-200 px-3 py-3 ${card.tone}`}>
                                            <p className="text-xs uppercase tracking-wide">{card.label}</p>
                                            <p className="text-2xl font-bold mt-1">{card.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 px-4 pb-4 text-sm">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white font-semibold shadow-sm">
                                        <span>Total Revenue</span>
                                        <span className="text-lg">{formatINR(bookingInsights.revenue)}</span>
                                    </div>
                                    <span className="text-neutral-600">Tracking based on loaded bookings</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                        <h3 className="text-lg font-semibold">Recent Bookings</h3>
                                        <span className="text-xs text-neutral-500">Last 5</span>
                                    </div>
                                    <div className="divide-y divide-neutral-100">
                                        {bookingInsights.recent.length === 0 && <div className="px-4 py-6 text-sm text-neutral-500">No bookings yet.</div>}
                                        {bookingInsights.recent.map((b) => {
                                            const status = normalizeBookingStatus(b);
                                            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                            return (
                                                <div key={b._id} className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold text-neutral-900">{b.packageName || b.package || "Package"}</p>
                                                            <p className="text-xs text-neutral-500">{b.day || "—"}{b.time ? ` • ${b.time}` : ""}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-semibold text-neutral-900">{formatINR(Number(b.total || 0))}</p>
                                                            <p className="text-xs text-neutral-500">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ""}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 inline-flex px-2 py-1 rounded-full text-xs bg-neutral-100 text-neutral-700">{statusLabel}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-neutral-500">Bookings</p>
                                            <h3 className="text-lg font-semibold text-neutral-900">10-day trend</h3>
                                        </div>
                                        <span className="text-xs text-neutral-500">Sparkline</span>
                                    </div>
                                    <div className="h-36">
                                        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full text-orange-600">
                                            <polyline
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                points={bookingTrend.points.map((p) => `${p.x},${(p.y / 100) * 60}`).join(" ") || "0,60 100,60"}
                                            />
                                            {bookingTrend.points.map((p) => (
                                                <circle key={p.key} cx={p.x} cy={(p.y / 100) * 60} r={1.4} fill="currentColor" />
                                            ))}
                                        </svg>
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-600 mt-2">
                                        <span>{bookingTrend.days[0]?.label}</span>
                                        <span>{bookingTrend.days[bookingTrend.days.length - 1]?.label}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {tab === "users" && (
                    <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                <h2 className="font-semibold">Users</h2>
                                <button onClick={loadUsers} className="text-sm px-3 py-2 rounded border">Refresh</button>
                            </div>
                            {usersLoading && <div className="p-4 text-sm text-neutral-600">Loading users…</div>}
                            {usersError && <div className="p-4 text-sm text-red-600">{usersError}</div>}
                            {!usersLoading && !usersError && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-neutral-100 text-neutral-700">
                                            <tr>
                                                <th className="text-left px-4 py-3">Name</th>
                                                <th className="text-left px-4 py-3">Email</th>
                                                <th className="text-left px-4 py-3">Role</th>
                                                <th className="text-left px-4 py-3">Created</th>
                                                <th className="text-right px-4 py-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u) => (
                                                <tr key={u._id} className="border-t border-neutral-100">
                                                    <td className="px-4 py-3 font-medium">{u.username || u.firstName || u.email}</td>
                                                    <td className="px-4 py-3 text-neutral-700">{u.email}</td>
                                                    <td className="px-4 py-3 text-neutral-700">{u.role || "user"}</td>
                                                    <td className="px-4 py-3 text-neutral-600">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-3">
                                                        <button onClick={() => startEditUser(u)} className="text-sm text-orange-600 hover:underline">Edit</button>
                                                        <button onClick={() => deleteUser(u._id)} className="text-sm text-red-600 hover:underline">Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
                            <h3 className="font-semibold mb-3">{editingUserId ? "Edit User" : "Create User"}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-neutral-600">Email</label>
                                    <input value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
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
                                    <label className="text-xs text-neutral-600">Username</label>
                                    <input value={userForm.username} onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-600">Role</label>
                                    <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1">
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!token) return;
                                            const trimmedPassword = (userForm.password || "").trim();
                                            const trimmedConfirm = (userForm.confirmPassword || "").trim();

                                            if (!editingUserId) {
                                                if (!trimmedPassword || trimmedPassword !== trimmedConfirm) {
                                                    alert('Passwords do not match');
                                                    return;
                                                }
                                            } else if (trimmedPassword || trimmedConfirm) {
                                                if (trimmedPassword !== trimmedConfirm) {
                                                    alert('Passwords do not match');
                                                    return;
                                                }
                                            }

                                            setSavingUser(true);
                                            const payload: any = {
                                                username: userForm.username.trim(),
                                                email: userForm.email.trim(),
                                                role: userForm.role === 'admin' ? 'admin' : 'user',
                                            };
                                            if (trimmedPassword) {
                                                payload.password = trimmedPassword;
                                                payload.confirmPassword = trimmedConfirm || trimmedPassword;
                                            }

                                            const path = editingUserId ? `/admin/users/${editingUserId}` : '/admin/users';
                                            const method = editingUserId ? 'PUT' : 'POST';
                                            const res = await apiSend(path, token, method, payload);
                                            setSavingUser(false);
                                            if (!res.ok) { alert('Failed to save user'); return; }
                                            setUserForm({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
                                            setEditingUserId(null);
                                            loadUsers();
                                        }}
                                        disabled={savingUser}
                                        className="flex-1 bg-orange-600 text-white rounded px-3 py-2 text-sm"
                                    >
                                        {savingUser ? (editingUserId ? 'Saving…' : 'Creating…') : editingUserId ? 'Update' : 'Create'}
                                    </button>
                                    <button
                                        onClick={() => { setUserForm({ username: '', email: '', password: '', confirmPassword: '', role: 'user' }); setEditingUserId(null); }}
                                        className="px-3 py-2 text-sm border rounded"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {tab === "bookings" && (
                    <section className="mt-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                            <h2 className="font-semibold">Bookings</h2>
                            <button onClick={loadBookings} className="text-sm px-3 py-2 rounded border">Refresh</button>
                        </div>
                        {bookingsLoading && <div className="p-4 text-sm text-neutral-600">Loading bookings…</div>}
                        {bookingsError && <div className="p-4 text-sm text-red-600">{bookingsError}</div>}
                        {!bookingsLoading && !bookingsError && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-100 text-neutral-700">
                                        <tr>
                                            <th className="text-left px-4 py-3">Package</th>
                                            <th className="text-left px-4 py-3">Day / Time</th>
                                            <th className="text-left px-4 py-3">Total</th>
                                            <th className="text-left px-4 py-3">Status</th>
                                            <th className="text-left px-4 py-3">User</th>
                                            <th className="text-left px-4 py-3">Created</th>
                                            <th className="text-right px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings.map((b) => {
                                            const rawStatus = (b.status || (b as any).bookingStatus || (b as any).orderStatus || 'pending').toString().toLowerCase();
                                            const allowed = ['pending','accepted','dispatched','delivered','cancelled'];
                                            const status = allowed.includes(rawStatus) ? rawStatus : 'pending';
                                            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                            return (
                                                <tr key={b._id} className="border-t border-neutral-100">
                                                    <td className="px-4 py-3 font-medium">{b.packageName || b.package || "—"}</td>
                                                    <td className="px-4 py-3 text-neutral-700">{b.day || "—"} {b.time ? `• ${b.time}` : ""}</td>
                                                    <td className="px-4 py-3 text-neutral-900">₹{Number(b.total || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3"><span className="inline-flex px-2 py-1 rounded-full text-xs bg-neutral-100 text-neutral-700">{statusLabel}</span></td>
                                                    <td className="px-4 py-3 text-neutral-700">{b.userId || "—"}</td>
                                                    <td className="px-4 py-3 text-neutral-600">{b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                        <select
                                                            value={status}
                                                            onChange={(e) => updateBookingStatus(b._id, e.target.value)}
                                                            className="border rounded px-2 py-1 text-xs"
                                                        >
                                                            {['pending','accepted','dispatched','delivered','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                        <button onClick={() => cancelBooking(b._id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {tab === "items" && (
                    <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                <h2 className="font-semibold">Menu Items</h2>
                                <button onClick={loadItems} className="text-sm px-3 py-2 rounded border">Refresh</button>
                            </div>
                            {itemsLoading && <div className="p-4 text-sm text-neutral-600">Loading items…</div>}
                            {itemsError && <div className="p-4 text-sm text-red-600">{itemsError}</div>}
                            {!itemsLoading && !itemsError && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-neutral-100 text-neutral-700">
                                            <tr>
                                                <th className="text-left px-4 py-3">Image</th>
                                                <th className="text-left px-4 py-3">Name</th>
                                                <th className="text-left px-4 py-3">Category</th>
                                                <th className="text-left px-4 py-3">Price</th>
                                                <th className="text-left px-4 py-3">Available</th>
                                                <th className="text-right px-4 py-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it) => (
                                                <tr key={it._id || it.id} className="border-t border-neutral-100">
                                                    <td className="px-4 py-3">
                                                        {resolveImageSrc(it.image) ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={resolveImageSrc(it.image)} alt={it.name || it.title || "item"} className="h-12 w-16 object-cover rounded border" />
                                                        ) : (
                                                            <div className="h-12 w-16 rounded border bg-neutral-50 flex items-center justify-center text-xs text-neutral-500">
                                                                {(it.name || it.title || "I").slice(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{it.name || it.title || it.id}</td>
                                                    <td className="px-4 py-3 text-neutral-700">{it.category || "—"}</td>
                                                    <td className="px-4 py-3 text-neutral-900">₹{Number(it.price || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-neutral-700">{it.available === false ? "No" : "Yes"}</td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                        <button onClick={() => editItem(it)} className="text-sm text-orange-600 hover:underline">Edit</button>
                                                        <button onClick={() => deleteItem(it._id || it.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
                            <h3 className="font-semibold mb-3">{itemForm._id ? "Edit Item" : "Add Item"}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-neutral-600">Name</label>
                                    <input value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" placeholder="Paneer Butter Masala" />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-600">Description</label>
                                    <textarea value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded px-3 py-2 mt-1" rows={3} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-600">Image</label>
                                    <div className="text-xs text-neutral-500">Choose a file from your computer to send as the item image.</div>
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="text-sm"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) { setItemImagePreview(undefined); setItemImageFile(undefined); return; }
                                                // Guard against very large files; base64 adds ~33%, so keep well under 1MB
                                                if (file.size > MAX_IMAGE_BYTES) {
                                                    alert('Image too large. Please pick a file under 700KB.');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    const dataUrl = reader.result as string;
                                                    setItemImagePreview(dataUrl);
                                                    setItemImageFile(file);
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                        {(itemImagePreview || itemForm.image) && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={itemImagePreview || itemForm.image} alt="preview" className="mt-2 h-24 w-32 object-cover rounded" />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-600">Price</label>
                                        <input type="number" step="0.01" value={itemForm.price ?? 0} onChange={(e) => setItemForm((f) => ({ ...f, price: Number(e.target.value) }))} className="w-full border rounded px-3 py-2 mt-1" placeholder="6.5" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-600">Category</label>
                                        <select
                                            value={itemForm.category || "veg"}
                                            onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                                            className="w-full border rounded px-3 py-2 mt-1"
                                        >
                                            <option value="veg">Veg</option>
                                            <option value="non-veg">Non Veg</option>
                                            <option value="mixed">Mixed</option>
                                            <option value="premium">Premium</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-600">Available</label>
                                    <select value={itemForm.available ? "true" : "false"} onChange={(e) => setItemForm((f) => ({ ...f, available: e.target.value === "true" }))} className="w-full border rounded px-3 py-2 mt-1">
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={saveItem} disabled={savingItem} className="flex-1 bg-orange-600 text-white rounded px-3 py-2 text-sm">{savingItem ? "Saving…" : itemForm._id ? "Update" : "Add"}</button>
                                    {itemForm._id && <button onClick={() => { setItemForm({ name: "", description: "", price: 0, category: "", available: true, image: "" }); setItemImagePreview(undefined); }} className="px-3 py-2 text-sm border rounded">Clear</button>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}