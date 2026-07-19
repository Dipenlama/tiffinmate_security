// Derive API base from env: prefer full base, otherwise combine origin + prefix for flexible setups
const envOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN || '').trim();
const envPrefix = (process.env.NEXT_PUBLIC_API_PREFIX || '').trim();
const envBase = (process.env.NEXT_PUBLIC_API_BASE || '').trim();
const derivedBase = envOrigin && envPrefix
  ? `${envOrigin.replace(/\/$/, '')}${envPrefix.startsWith('/') ? envPrefix : `/${envPrefix}`}`
  : '';
export const API_BASE = envBase || derivedBase || 'http://localhost:5050/api';

async function handleResp(resp: Response) {
  if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || resp.statusText);
  return resp.json().catch(() => ({}));
}

// --- CSRF (double-submit cookie) -------------------------------------------
// The backend now authenticates via httpOnly cookies instead of a
// JS-readable token, so every mutating request must also prove it came from
// same-origin frontend JS by echoing the CSRF cookie's value back in a
// header (see tiffin-mate-api src/middlewares/csrf.middleware.ts). The token
// itself is not secret - it's cached in memory for the page's lifetime to
// avoid re-fetching it before every single write.
let cachedCsrfToken: string | null = null;

// Exported so page components that make their own raw `fetch` calls (instead
// of going through a helper in this file) can still attach a valid CSRF
// header without duplicating the fetch-and-cache logic.
export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include' });
  const json = await res.json().catch(() => ({} as any));
  const token: string = json.csrfToken || '';
  cachedCsrfToken = token;
  return token;
}

// Merges the CSRF header into a headers object for a mutating request.
async function withCsrfHeader(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const csrfToken = await getCsrfToken();
  return { ...headers, 'X-CSRF-Token': csrfToken };
}

// --- Auth --------------------------------------------------------------
// login/register/forgot-password/reset-password/mfa-login-verify all happen
// before a session cookie exists, so the backend exempts them from the CSRF
// check (see EXEMPT_PATHS in csrf.middleware.ts) - no token needed here.

export async function postForgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function postResetPassword(token: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function postLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  // Always parse the body (even on success) rather than throwing on !ok,
  // since the caller needs to branch on `mfaRequired` in the 200 response.
  return handleResp(res);
}

export async function postRegister(fullName: string, email: string, password: string, confirmPassword: string) {
  // Backend expects `username` and `confirmPassword`, so map full name into
  // username and send both password fields.
  const payload = { username: fullName, name: fullName, fullName, email, password, confirmPassword };
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handleResp(res);
}

// Step 2 of an MFA-gated login: exchange the pre-auth token + a 6-digit TOTP
// code for a real session (sets the httpOnly cookies).
export async function postMfaLoginVerify(mfaToken: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/mfa/login-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken, code }),
    credentials: 'include',
  });
  return handleResp(res);
}

// The following three require an existing authenticated session (cookie),
// so - unlike the pre-auth endpoints above - they DO need the CSRF header.
export async function postMfaSetup() {
  const res = await fetch(`${API_BASE}/auth/mfa/setup`, {
    method: 'POST',
    headers: await withCsrfHeader(),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function postMfaVerifySetup(code: string) {
  const res = await fetch(`${API_BASE}/auth/mfa/verify-setup`, {
    method: 'POST',
    headers: await withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code }),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function postMfaDisable(code: string) {
  const res = await fetch(`${API_BASE}/auth/mfa/disable`, {
    method: 'POST',
    headers: await withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code }),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function postLogout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: await withCsrfHeader(),
    credentials: 'include',
  });
  cachedCsrfToken = null; // the session is gone; force a fresh token next time
  return handleResp(res);
}

// --- Admin: users --------------------------------------------------------
// `token` is kept as a parameter for backwards compatibility with existing
// callers, but is no longer required: authorizedMiddelWare on the backend
// checks the httpOnly session cookie first and only falls back to this
// header, so as long as `credentials: 'include'` is set (it always is below),
// admin pages work whether or not they still have a cached token lying around.
export async function fetchAdminUsers(token?: string, page = 1, limit = 10) {
  const url = `${API_BASE}/admin/users?page=${page}&limit=${limit}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  // NOTE: previously returned handleResp(res) (the raw parsed body), but every
  // caller (app/admin/users/page.tsx) checks `.ok`/`.data` like the other
  // fetch*/update*/delete* helpers in this file - that mismatch meant the
  // admin Users page always rendered "No users or access denied" regardless
  // of whether the request actually succeeded. Pre-existing bug, found while
  // verifying this page still works after the cookie-auth migration.
  return { ok: res.ok, status: res.status, data: json };
}

export async function deleteAdminUser(token: string | undefined, id: string) {
  const headers = await withCsrfHeader(token ? { Authorization: `Bearer ${token}` } : {});
  const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers, credentials: 'include' });
  return res;
}

export async function fetchUserById(token: string | undefined, id: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}`, { headers, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  // Defense in depth: the backend's toJSON transform already strips the
  // password hash from every response, but scrub again here in case an
  // older/alternate endpoint shape ever slips one through.
  const scrubbed = (() => {
    const clone = typeof json === 'object' && json !== null ? { ...json } : json;
    if (clone?.data?.password) delete clone.data.password;
    if (clone?.password) delete clone.password;
    return clone;
  })();
  return { ok: res.ok, status: res.status, data: scrubbed };
}

export async function updateUserById(token: string | undefined, id: string, data: any) {
  const headers = await withCsrfHeader({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  });
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

// --- Menu / items (public) ------------------------------------------------

export async function fetchMenu() {
  // Primary: /items (per backend URL provided), fallback: /menu for legacy
  const tryFetch = async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`);
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  };

  const primary = await tryFetch('/items');
  if (primary.ok) return primary.data;

  const fallback = await tryFetch('/menu');
  if (fallback.ok) return fallback.data;

  // If both fail, throw with best effort message
  const err = primary.data?.message || fallback.data?.message || 'Failed to fetch menu/items';
  throw new Error(err);
}

export async function fetchMenuItem(id: string) {
  const res = await fetch(`${API_BASE}/menu/${id}`);
  return handleResp(res);
}

// --- Orders / bookings (authenticated) ------------------------------------

export async function createOrder(payload: { items: any[]; address: string; payment: string }) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: await withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handleResp(res);
}

export async function createBooking(payload: any, idempotencyKey?: string) {
  const headers = await withCsrfHeader({ 'Content-Type': 'application/json' });
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const postTo = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `${API_BASE}/bookings`,
    `${API_BASE}/booking`,
    `/api/bookings`,
    `/api/booking`,
  ];

  for (const url of attempts) {
    try {
      const res = await postTo(url);
      if (res.status !== 404) return res;
    } catch (e) {
      // continue to next attempt
      continue;
    }
  }

  return { ok: false, status: 0, data: { error: 'All booking endpoints failed' } };
}

export async function createPaymentSession(bookingId: string) {
  try {
    const res = await fetch(`${API_BASE}/payments/create-checkout-session`, {
      method: 'POST',
      headers: await withCsrfHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ bookingId }),
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`, { credentials: 'include' });
  return handleResp(res);
}

export async function fetchOrderById(id: string) {
  const res = await fetch(`${API_BASE}/orders/${id}`, { credentials: 'include' });
  return handleResp(res);
}

// --- Profile (authenticated) ----------------------------------------------

export async function fetchProfile() {
  const getFrom = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `${API_BASE}/auth/me`,
    `${API_BASE}/profile`,
    `${API_BASE}/me`,
    `${API_BASE}/users/me`,
  ];

  let lastErr: string | null = null;
  for (const url of attempts) {
    try {
      const res = await getFrom(url);
      if (res.status === 404) continue;
      if (!res.ok) {
        lastErr = res.data?.message || res.data?.error || 'Failed to fetch profile';
        continue;
      }
      return res.data?.data || res.data?.user || res.data || {};
    } catch (e: any) {
      lastErr = e?.message || 'Failed to fetch profile';
    }
  }

  throw new Error(lastErr || 'Failed to fetch profile');
}

export async function updateProfile(data: any) {
  const headers = await withCsrfHeader({ 'Content-Type': 'application/json' });

  const putTo = async (url: string) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `/api/users/me`, // explicit frontend route for current user update
    `${API_BASE}/users/me`,
    `${API_BASE}/profile`,
    `${API_BASE}/auth/me`,
  ];

  for (const url of attempts) {
    try {
      const res = await putTo(url);
      if (res.status !== 404) return res;
    } catch (e) {
      continue;
    }
  }

  return { ok: false, status: 0, data: { error: 'All profile update endpoints failed' } };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const headers = await withCsrfHeader({ 'Content-Type': 'application/json' });

  const postTo = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `${API_BASE}/auth/change-password`,
    `${API_BASE}/profile/change-password`,
  ];

  for (const url of attempts) {
    try {
      const res = await postTo(url);
      if (res.status !== 404) return res;
    } catch (e) {
      continue;
    }
  }

  return { ok: false, status: 0, data: { error: 'All change-password endpoints failed' } };
}

export async function fetchAddresses() {
  const getFrom = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `${API_BASE}/profile/addresses`,
    `${API_BASE}/addresses`,
    `${API_BASE}/profile/address`,
    `${API_BASE}/auth/addresses`,
    `${API_BASE}/users/addresses`,
  ];

  let lastErr: string | null = null;
  for (const url of attempts) {
    try {
      const res = await getFrom(url);
      if (res.status === 404) continue; // try next shape
      if (!res.ok) {
        lastErr = res.data?.message || res.data?.error || 'Failed to fetch addresses';
        continue;
      }
      return res.data?.data || res.data?.addresses || res.data || [];
    } catch (e: any) {
      lastErr = e?.message || 'Failed to fetch addresses';
      continue;
    }
  }

  if (lastErr) throw new Error(lastErr);
  return []; // all 404s
}

export async function addAddress(addr: string) {
  const headers = await withCsrfHeader({ 'Content-Type': 'application/json' });

  const postTo = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ address: addr }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json } as const;
  };

  const attempts = [
    `${API_BASE}/profile/addresses`,
    `${API_BASE}/addresses`,
    `${API_BASE}/profile/address`,
    `${API_BASE}/auth/addresses`,
    `${API_BASE}/users/addresses`,
  ];

  let lastErr: string | null = null;
  for (const url of attempts) {
    try {
      const res = await postTo(url);
      if (res.status === 404) continue;
      if (!res.ok) {
        lastErr = res.data?.message || res.data?.error || 'Failed to add address';
        continue;
      }
      return res.data;
    } catch (e: any) {
      lastErr = e?.message || 'Failed to add address';
      continue;
    }
  }

  throw new Error(lastErr || 'Failed to add address');
}

export async function fetchAdminOrders() {
  const res = await fetch(`${API_BASE}/admin/orders`, { credentials: 'include' });
  return handleResp(res);
}

export async function updateAdminOrderStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: await withCsrfHeader({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  return handleResp(res);
}
