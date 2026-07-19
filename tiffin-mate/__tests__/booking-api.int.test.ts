import request from 'supertest';
import { NextRequest } from 'next/server';
import { POST as bookingPost } from '../app/api/booking/route';
import { POST as bookingsPost } from '../app/api/bookings/route';

// Helper to create a NextRequest for Supertest-like invocation
function createNextRequest(body: any = {}, headers: Record<string, string> = {}) {
  const url = 'http://localhost/api/test';
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
  // NextRequest constructor signature matches native Request + URL
  return new NextRequest(url, init as any);
}

declare const global: any;

describe('Booking API proxy integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async (url: string, init?: any) => {
      const body = init?.body as string | undefined;
      const parsed = body ? JSON.parse(body) : undefined;
      const okResponse = {
        booking: true,
        url,
        method: init?.method,
        payload: parsed,
      };
      return new Response(JSON.stringify(okResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('booking POST proxies to backend', async () => {
    const req = createNextRequest({ foo: 'bar' });
    const res = await bookingPost(req);
    const json = await res.json();
    expect(json.booking).toBe(true);
    expect(json.method).toBe('POST');
    expect(json.payload).toEqual({ foo: 'bar' });
  });

  test('bookings POST proxies to backend', async () => {
    const req = createNextRequest({ multi: true });
    const res = await bookingsPost(req);
    const json = await res.json();
    expect(json.booking).toBe(true);
    expect(json.payload).toEqual({ multi: true });
  });

  test('forwards content-type header', async () => {
    const req = createNextRequest({ a: 1 }, { 'content-type': 'application/json' });
    await bookingPost(req);
    expect(global.fetch).toHaveBeenCalled();
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers: Headers = init.headers;
    expect(headers.get('content-type')).toBe('application/json');
  });

  test('forwards authorization header', async () => {
    const req = createNextRequest({ a: 1 }, { authorization: 'Bearer token123' });
    await bookingPost(req);
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers: Headers = init.headers;
    expect(headers.get('authorization')).toBe('Bearer token123');
  });

  test('forwards idempotency-key header', async () => {
    const req = createNextRequest({ a: 1 }, { 'idempotency-key': 'abc' });
    await bookingPost(req);
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers: Headers = init.headers;
    expect(headers.get('idempotency-key')).toBe('abc');
  });

  test('forwards cookie header', async () => {
    const req = createNextRequest({ a: 1 }, { cookie: 'test=1' });
    await bookingPost(req);
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers: Headers = init.headers;
    expect(headers.get('cookie')).toBe('test=1');
  });

  test('forwards accept header', async () => {
    const req = createNextRequest({ a: 1 }, { accept: 'application/json' });
    await bookingPost(req);
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers: Headers = init.headers;
    expect(headers.get('accept')).toBe('application/json');
  });

  test('supports empty body for GET-like use', async () => {
    const req = new NextRequest('http://localhost/api/test', { method: 'POST' } as any);
    const res = await bookingPost(req);
    const json = await res.json();
    expect(json.payload).toBeUndefined();
  });

  test('handles backend error by propagating status', async () => {
    global.fetch = jest.fn(async () => {
      return new Response('fail', { status: 500, headers: { 'content-type': 'text/plain' } });
    });
    const req = createNextRequest({});
    const res = await bookingPost(req);
    expect(res.status).toBe(500);
  });

  test('bookings route uses /bookings backend URL', async () => {
    const captured: string[] = [];
    global.fetch = jest.fn(async (url: string, init?: any) => {
      captured.push(url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const req = createNextRequest({});
    await bookingsPost(req);
    expect(captured[0]).toContain('/bookings');
  });
});
