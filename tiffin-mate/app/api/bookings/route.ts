import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '../../../lib/api';

export const dynamic = 'force-dynamic';

async function proxyBookings(req: NextRequest) {
  const url = `${API_BASE}/bookings`;
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  const auth = req.headers.get('authorization');
  const idempotencyKey = req.headers.get('idempotency-key');
  const cookie = req.headers.get('cookie');
  const accept = req.headers.get('accept');

  if (contentType) headers.set('content-type', contentType);
  if (auth) headers.set('authorization', auth);
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);
  if (cookie) headers.set('cookie', cookie);
  if (accept) headers.set('accept', accept);

  const bodyText = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: bodyText,
      cache: 'no-store',
    });
    const resBody = await res.text();
    const resHeaders = new Headers();
    const resContentType = res.headers.get('content-type');
    if (resContentType) resHeaders.set('content-type', resContentType);
    return new NextResponse(resBody, { status: res.status, headers: resHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Bookings proxy failed', details: String(error?.message || error) },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  return proxyBookings(req);
}

export async function GET(req: NextRequest) {
  return proxyBookings(req);
}
