import http from 'http';
import request from 'supertest';
import { NextRequest } from 'next/server';

import { POST as bookingPost } from '../app/api/booking/route';
import { POST as bookingsPost } from '../app/api/bookings/route';
import { API_BASE } from '../lib/api';

declare const global: any;

function createServer(handler: (req: NextRequest) => Promise<Response>) {
  return http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const url = `http://localhost${req.url}`;
        const init: any = {
          method: req.method,
          headers: req.headers as any,
        };
        if (body) {
          init.body = body;
        }
        const nextReq = new NextRequest(url, init);
        const nextRes = await handler(nextReq as any);
        res.statusCode = nextRes.status;
        nextRes.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const text = await nextRes.text();
        res.end(text);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'handler-error' }));
      }
    });
  });
}

describe('booking route via Supertest', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('proxies POST /api/booking with JSON body', async () => {
    const payload = { day: 'Mon', slot: 'lunch' };
    const fetchMock = jest.fn(async (_url: string, init: any) => {
      return new Response(JSON.stringify({ ok: true, payload: JSON.parse(init.body) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });
    global.fetch = fetchMock;

    const server = createServer(bookingPost as any);
    const res = await request(server).post('/api/booking').send(payload).expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.body.ok).toBe(true);
    expect(res.body.payload).toEqual(payload);
    server.close();
  });

  test('forwards custom headers from client to backend', async () => {
    let receivedHeaders: Headers | undefined;
    const fetchMock = jest.fn(async (_url: string, init: any) => {
      receivedHeaders = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });
    global.fetch = fetchMock;

    const server = createServer(bookingPost as any);
    await request(server)
      .post('/api/booking')
      .set('authorization', 'Bearer token-123')
      .set('idempotency-key', 'idem-1')
      .send({});

    expect(receivedHeaders?.get('authorization')).toBe('Bearer token-123');
    expect(receivedHeaders?.get('idempotency-key')).toBe('idem-1');
    server.close();
  });

  test('uses correct backend URL for /booking', async () => {
    const urls: string[] = [];
    const fetchMock = jest.fn(async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });
    global.fetch = fetchMock;

    const server = createServer(bookingPost as any);
    await request(server).post('/api/booking').send({});

    expect(urls[0]).toBe(`${API_BASE}/booking`);
    server.close();
  });

  test('returns 502 when backend call throws', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('boom');
    });

    const server = createServer(bookingPost as any);
    const res = await request(server).post('/api/booking').send({}).expect(502);
    expect(res.body.error).toBeDefined();
    server.close();
  });

  test('returns backend status code when not ok', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ message: 'bad' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingPost as any);
    const res = await request(server).post('/api/booking').send({}).expect(400);
    expect(res.body.message).toBe('bad');
    server.close();
  });

  test('handles empty request body', async () => {
    const fetchMock = jest.fn(async (_url: string, init: any) => {
      return new Response(JSON.stringify({ hasBody: !!init.body }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });
    global.fetch = fetchMock;

    const server = createServer(bookingPost as any);
    const res = await request(server).post('/api/booking').expect(200);

    expect(res.body.hasBody).toBe(false);
    server.close();
  });

  test('passes through content-type header', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingPost as any);
    await request(server).post('/api/booking').set('content-type', 'application/json').send({ a: 1 });

    expect(headersSeen?.get('content-type')).toContain('application/json');
    server.close();
  });

  test('includes cookie header when provided', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingPost as any);
    await request(server)
      .post('/api/booking')
      .set('Cookie', 'session=abc')
      .send({});

    expect(headersSeen?.get('cookie')).toContain('session=abc');
    server.close();
  });

  test('sets accept header downstream', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingPost as any);
    await request(server).post('/api/booking').set('accept', 'application/json').send({});

    expect(headersSeen?.get('accept')).toContain('application/json');
    server.close();
  });

  test('responds with JSON content-type', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingPost as any);
    const res = await request(server).post('/api/booking').send({});
    expect(res.headers['content-type']).toContain('application/json');
    server.close();
  });
});

describe('bookings route via Supertest', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('proxies POST /api/bookings with payload', async () => {
    const body = { items: [1, 2, 3] };
    global.fetch = jest.fn(async (_url: string, init: any) => {
      return new Response(JSON.stringify({ ok: true, body: JSON.parse(init.body) }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').send(body).expect(201);

    expect(res.body.body).toEqual(body);
    server.close();
  });

  test('uses correct backend URL for /bookings', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    await request(server).post('/api/bookings').send({});

    expect(urls[0]).toBe(`${API_BASE}/bookings`);
    server.close();
  });

  test('returns 502 when backend throws', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('boom');
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').send({}).expect(502);
    expect(res.body.error).toBeDefined();
    server.close();
  });

  test('returns backend error status', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ message: 'bad' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').send({}).expect(409);
    expect(res.body.message).toBe('bad');
    server.close();
  });

  test('passes authorization header', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    await request(server)
      .post('/api/bookings')
      .set('authorization', 'Bearer abc')
      .send({});

    expect(headersSeen?.get('authorization')).toBe('Bearer abc');
    server.close();
  });

  test('passes through cookies header', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    await request(server)
      .post('/api/bookings')
      .set('Cookie', 'sid=123')
      .send({});

    expect(headersSeen?.get('cookie')).toContain('sid=123');
    server.close();
  });

  test('handles no body on /bookings', async () => {
    global.fetch = jest.fn(async (_url: string, init: any) => {
      return new Response(JSON.stringify({ hasBody: !!init.body }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').expect(200);
    expect(res.body.hasBody).toBe(false);
    server.close();
  });

  test('propagates JSON content-type header', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').send({});
    expect(res.headers['content-type']).toContain('application/json');
    server.close();
  });

  test('accept header is forwarded', async () => {
    let headersSeen: Headers | undefined;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      headersSeen = init.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    await request(server).post('/api/bookings').set('accept', 'application/json').send({});
    expect(headersSeen?.get('accept')).toContain('application/json');
    server.close();
  });

  test('responds with body from backend', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ created: true, id: 'B123' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }) as any;
    });

    const server = createServer(bookingsPost as any);
    const res = await request(server).post('/api/bookings').send({}).expect(201);
    expect(res.body.created).toBe(true);
    expect(res.body.id).toBe('B123');
    server.close();
  });
});
