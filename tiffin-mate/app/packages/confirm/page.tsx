"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { packageMenu, vegFixedPackages } from "../data";

export default function ConfirmPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('bookingDraft');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setBooking(parsed);
      setAddress(parsed.address || parsed.meta?.address || '');
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">No booking found</div>
          <div className="mt-4 text-sm text-neutral-600">Please select items first.</div>
          <div className="mt-6">
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-orange-600 text-white rounded">Go to dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const total = booking.total || booking.items?.reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
  const dayLabel = Array.isArray(booking?.days) ? booking.days.join(', ') : booking?.day;

  const cancel = () => {
    sessionStorage.removeItem('bookingDraft');
    router.push('/dashboard');
  };

  const makePayment = async () => {
    setProcessing(true);
    try {
      const raw = sessionStorage.getItem('bookingDraft');
      if (!raw) return alert('No booking draft found');
      const draft = JSON.parse(raw);

      // If lib/api.createBooking and createPaymentSession are available, use them
      try {
        // dynamic import of API helpers from lib/api
        const api: any = await import('../../../lib/api');

        // Normalize package fields to satisfy backend validation
        const allowedPackages = ['Veg','Non-Veg','Mixed','Premium'];
        const pickedPackage = allowedPackages.includes(draft.package) ? draft.package : allowedPackages.includes(draft.packageName) ? draft.packageName : 'Veg';
        const packageName = draft.packageName || draft.package || `${pickedPackage} Plan`;

        const daysArray = Array.isArray(draft.days) ? draft.days : draft.day ? [draft.day] : ['Mon'];
        const primaryDay = daysArray[0] || 'Mon';

        const payload = {
          ...draft,
          package: pickedPackage,
          packageName,
          frequency: draft.frequency || 'once',
          day: primaryDay,
          days: daysArray,
          time: draft.time || 'Lunch',
          address: address || draft.address || undefined,
          items: (draft.items || []).map((it: any) => ({
            id: it.id,
            name: it.name,
            qty: Number(it.qty || 1),
            price: Number(it.price || 0),
            subtotal: Number(it.subtotal || (it.qty || 1) * (it.price || 0)),
          })),
          total: draft.total || draft.items?.reduce((s:number,it:any)=>s+(Number(it.subtotal)||0),0) || 0,
        };

        const draftWithAddress = { ...draft, address: payload.address };
        try { sessionStorage.setItem('bookingDraft', JSON.stringify(draftWithAddress)); } catch (e) {}

        const createRes: any = await api.createBooking(payload, draft.draftId || undefined);
        console.log('createBooking response', createRes);
        if (!createRes || !createRes.ok) {
          if (createRes?.status === 409) {
            // booking exists, use returned booking
            const existing = createRes.data;
            const bookingId = existing?._id || existing?.id || existing;
            if (!bookingId) {
              alert('Server returned 409 but no booking id. Response:\n' + JSON.stringify(createRes, null, 2));
              return;
            }
            // proceed to create payment session for existing booking
            const payJson: any = await api.createPaymentSession(String(bookingId)).catch(() => ({}));
            if (payJson?.data?.mock && payJson.data.redirect) { window.location.href = payJson.data.redirect; return; }
            if (payJson?.data?.url) { window.location.href = payJson.data.url; return; }
            alert('Payment creation returned no URL. Response:\n' + JSON.stringify(payJson, null, 2));
            return;
          }
          if (createRes?.status === 400) {
            alert('Validation error: ' + JSON.stringify(createRes.data));
            return;
          }
          // other error
          alert('Failed to create booking: ' + JSON.stringify(createRes));
          return;
        }

        const bookingId = createRes?.data?._id || createRes?.data?.id || createRes?.data;
        if (!bookingId) {
          alert('Booking created but server did not return id. Response:\n' + JSON.stringify(createRes, null, 2));
          return;
        }

        const payJson = await api.createPaymentSession(String(bookingId)).catch(() => ({}));
        if (payJson?.data?.mock && payJson.data.redirect) {
          window.location.href = payJson.data.redirect;
          return;
        }
        const url = payJson?.data?.url;
        if (url) {
          window.location.href = url;
        } else {
          // if no URL, redirect to local success page
          try { sessionStorage.removeItem('bookingDraft'); } catch (e) {}
          router.push('/packages/confirm/success');
        }
        return;
      } catch (err) {
        // if lib/api isn't available or network error, fallback to local mock
        console.warn('Booking API failed, falling back to mock', err);
      }

      // Fallback mock (no backend configured)
      await new Promise((r) => setTimeout(r, 700));
      try { sessionStorage.removeItem('bookingDraft'); } catch (e) {}
      router.push('/packages/confirm/success');
    } catch (e: any) {
      console.error(e);
      alert('Payment failed: ' + (e?.message || e));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="max-w-7xl mx-auto px-6 py-6">
        <div className="font-semibold text-lg">Confirm Booking</div>
        <div className="text-sm text-neutral-600">Review your selection and proceed to payment</div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 text-sm text-neutral-600">Package: <span className="font-medium">{booking.packageName || booking.package}</span></div>
          <div className="mb-4 text-sm text-neutral-600">Day(s): <span className="font-medium">{dayLabel}</span> • Time: <span className="font-medium">{booking.time}</span> • Frequency: <span className="font-medium">{booking.frequency || 'once'}</span></div>
          <div className="mb-6">
            <label className="text-xs text-neutral-500 uppercase tracking-wide">Delivery address</label>
            <textarea
              className="mt-2 w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Apartment, street, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {booking.items?.map((it: any) => {
              let displayName = it.name;
              if (/^[vnpm]\d+$/i.test(it.name) || /^\w\d+$/.test(it.name)) {
                const pkgKeys = Object.keys(packageMenu) as Array<string>;
                for (const pk of pkgKeys) {
                  const daysObj = (packageMenu as any)[pk] as Record<string, any>;
                  for (const d of Object.keys(daysObj)) {
                    const found = daysObj[d].find((x: any) => x.id === it.id);
                    if (found) { displayName = found.name; break; }
                  }
                  if (displayName !== it.name) break;
                }
                if (displayName === it.name) {
                  for (const vegPkg of vegFixedPackages) {
                    const daysObj = vegPkg.days as Record<string, any>;
                    for (const d of Object.keys(daysObj)) {
                      const found = daysObj[d].find((x: any) => x.id === it.id);
                      if (found) { displayName = found.name; break; }
                    }
                    if (displayName !== it.name) break;
                  }
                }
              }

              return (
                <div key={it.id} className="flex items-center justify-between bg-neutral-50 rounded p-3">
                  <div>
                    <div className="font-medium">{displayName}</div>
                    <div className="text-xs text-neutral-500">Qty: {it.qty} • Price: ₹{it.price}</div>
                  </div>
                  <div className="font-semibold">₹{it.subtotal}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Total</div>
            <div className="text-xl font-bold text-orange-600">₹{total}</div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={cancel} disabled={processing} className="px-4 py-2 bg-white border rounded">Cancel</button>
            <button onClick={makePayment} disabled={processing} className="px-4 py-2 bg-orange-600 text-white rounded">{processing ? 'Processing…' : 'Make Payment'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
