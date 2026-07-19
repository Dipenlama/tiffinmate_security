const globalAny: any = globalThis;

describe('API_BASE derivation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('uses NEXT_PUBLIC_API_BASE when set', async () => {
    process.env.NEXT_PUBLIC_API_BASE = 'https://example.com/api';
    process.env.NEXT_PUBLIC_API_ORIGIN = 'https://ignore-origin.com';
    process.env.NEXT_PUBLIC_API_PREFIX = '/ignore';
    const { API_BASE } = await import('../lib/api');
    expect(API_BASE).toBe('https://example.com/api');
  });

  test('derives base from origin and prefix when base missing', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE;
    process.env.NEXT_PUBLIC_API_ORIGIN = 'https://api.example.com/';
    process.env.NEXT_PUBLIC_API_PREFIX = 'v1';
    const { API_BASE } = await import('../lib/api');
    expect(API_BASE).toBe('https://api.example.com/v1');
  });

  test('falls back to default localhost base', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE;
    delete process.env.NEXT_PUBLIC_API_ORIGIN;
    delete process.env.NEXT_PUBLIC_API_PREFIX;
    const { API_BASE } = await import('../lib/api');
    expect(API_BASE).toBe('http://localhost:5050/api');
  });

  test('trims whitespace around env vars', async () => {
    process.env.NEXT_PUBLIC_API_BASE = '  https://trimmed.com/api  ';
    const { API_BASE } = await import('../lib/api');
    expect(API_BASE).toBe('https://trimmed.com/api');
  });
});

describe('auth API helpers', () => {
  beforeEach(() => {
    globalAny.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('postForgotPassword posts email payload', async () => {
    const { postForgotPassword, API_BASE } = await import('../lib/api');
    await postForgotPassword('user@example.com');
    expect(globalAny.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/forgot-password`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      }),
    );
  });

  test('postResetPassword posts token and password', async () => {
    const { postResetPassword, API_BASE } = await import('../lib/api');
    await postResetPassword('tok123', 'new-pass');
    expect(globalAny.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/reset-password`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tok123', password: 'new-pass' }),
      }),
    );
  });

  test('postLogin posts email and password', async () => {
    const { postLogin, API_BASE } = await import('../lib/api');
    await postLogin('user@example.com', 'secret');
    expect(globalAny.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
      }),
    );
  });

  test('changePassword posts to first non-404 endpoint', async () => {
    // changePassword is a cookie-authenticated mutating call, so it fetches a
    // CSRF token first (see withCsrfHeader in lib/api.ts) before the actual
    // fallback attempts - that's an extra leading fetch call to account for.
    const calls: string[] = [];
    globalAny.fetch = jest
      .fn()
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({ csrfToken: 'test-csrf-token' }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
      })
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({ message: 'missing' }), { status: 404, headers: { 'content-type': 'application/json' } }) as any;
      })
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
      });

    const { changePassword, API_BASE } = await import('../lib/api');
    const res = await changePassword('old', 'new');
    expect(calls[0]).toBe(`${API_BASE}/auth/csrf-token`);
    expect(calls[1]).toBe(`${API_BASE}/auth/change-password`);
    expect(calls[2]).toBe(`${API_BASE}/profile/change-password`);
    expect(res.ok).toBe(true);
  });
});

describe('fetchMenu behaviour', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('fetchMenu returns data from /items when ok', async () => {
    const payload = { data: { items: [{ id: 1 }] } };
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
    });
    const { fetchMenu } = await import('../lib/api');
    const data = await fetchMenu();
    expect(data).toEqual(payload);
  });

  test('fetchMenu falls back to /menu when /items fails', async () => {
    const first = new Response(JSON.stringify({ message: 'fail' }), { status: 500, headers: { 'content-type': 'application/json' } }) as any;
    const second = new Response(JSON.stringify({ data: [{ id: 1 }] }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
    globalAny.fetch = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { fetchMenu } = await import('../lib/api');
    const data = await fetchMenu();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(data).toEqual({ data: [{ id: 1 }] });
  });

  test('fetchMenu throws when both endpoints fail', async () => {
    const first = new Response(JSON.stringify({ message: 'err1' }), { status: 500, headers: { 'content-type': 'application/json' } }) as any;
    const second = new Response(JSON.stringify({ message: 'err2' }), { status: 500, headers: { 'content-type': 'application/json' } }) as any;
    globalAny.fetch = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { fetchMenu } = await import('../lib/api');
    await expect(fetchMenu()).rejects.toThrow('err1');
  });

  test('fetchMenu handles non-JSON responses gracefully', async () => {
    const first = new Response('not-json', { status: 500 }) as any;
    const second = new Response('also-not-json', { status: 500 }) as any;
    globalAny.fetch = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { fetchMenu } = await import('../lib/api');
    await expect(fetchMenu()).rejects.toThrow();
  });
});

describe('createBooking helper', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('createBooking posts to /bookings first', async () => {
    // The CSRF-token fetch (getCsrfToken in lib/api.ts) always runs before
    // the booking-endpoint fallback attempts, so it's the first captured URL.
    const calls: string[] = [];
    globalAny.fetch = jest.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/csrf-token')) {
        return new Response(JSON.stringify({ csrfToken: 'test-csrf-token' }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
    });
    const { createBooking, API_BASE } = await import('../lib/api');
    const res = await createBooking({ foo: 'bar' });
    expect(calls[0]).toBe(`${API_BASE}/auth/csrf-token`);
    expect(calls[1]).toBe(`${API_BASE}/bookings`);
    expect(res.ok).toBe(true);
  });

  test('createBooking skips endpoints that return 404', async () => {
    const calls: string[] = [];
    globalAny.fetch = jest
      .fn()
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({ csrfToken: 'test-csrf-token' }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
      })
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({}), { status: 404, headers: { 'content-type': 'application/json' } }) as any;
      })
      .mockImplementationOnce(async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
      });
    const { createBooking, API_BASE } = await import('../lib/api');
    const res = await createBooking({ foo: 'bar' });
    expect(calls[0]).toBe(`${API_BASE}/auth/csrf-token`);
    expect(calls[1]).toBe(`${API_BASE}/bookings`);
    expect(calls[2]).toBe(`${API_BASE}/booking`);
    expect(res.ok).toBe(true);
  });

  test('createBooking returns failure when all endpoints fail', async () => {
    globalAny.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ error: 'nope' }), { status: 500, headers: { 'content-type': 'application/json' } }) as any;
    });
    const { createBooking } = await import('../lib/api');
    const res = await createBooking({});
    expect(res.ok).toBe(false);
    expect(res.data.error).toBeDefined();
  });

  test('createBooking attaches idempotency key header when provided', async () => {
    let lastHeaders: any;
    globalAny.fetch = jest.fn(async (_url: string, init: any) => {
      lastHeaders = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }) as any;
    });
    const { createBooking } = await import('../lib/api');
    await createBooking({}, 'key-123');
    const headerValue =
      (typeof lastHeaders?.get === 'function' && lastHeaders.get('Idempotency-Key')) ||
      lastHeaders?.['Idempotency-Key'] ||
      lastHeaders?.['idempotency-key'];
    expect(headerValue).toBe('key-123');
  });
});
