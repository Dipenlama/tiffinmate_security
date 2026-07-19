"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BookingDraft = {
  packageName?: string;
  package?: string;
  day?: string;
  time?: string;
  frequency?: string;
  address?: string;
  items?: Array<{ name?: string; title?: string; qty?: number; price?: number; subtotal?: number }>;
  total?: number;
};

export default function SuccessPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDraft | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bookingDraft");
      if (raw) {
        const parsed = JSON.parse(raw);
        setBooking(parsed);
      }
    } catch (e) {}
    // clear draft after success
    try {
      sessionStorage.removeItem("bookingDraft");
    } catch (e) {}
  }, []);

  const total = useMemo(() => {
    if (!booking) return undefined;
    if (typeof booking.total === "number") return booking.total;
    const items = booking.items || [];
    const sum = items.reduce((s, it) => s + (it.subtotal ?? (it.price || 0) * (it.qty || 1)), 0);
    return sum || undefined;
  }, [booking]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-700 font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold mt-4">Booking Confirmed</h2>
          <p className="mt-2 text-neutral-600">Thanks! We’ve received your booking.</p>
        </div>

        {booking && (
          <div className="mt-6 border-t border-neutral-200 pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-neutral-500">Package</div>
                <div className="font-medium">{booking.packageName || booking.package || "Standard"}</div>
              </div>
              <div>
                <div className="text-neutral-500">Schedule</div>
                <div className="font-medium">
                  {[booking.day, booking.time, booking.frequency].filter(Boolean).join(" • ") || "One-time"}
                </div>
              </div>
              {booking.address && (
                <div className="sm:col-span-2">
                  <div className="text-neutral-500">Delivery Address</div>
                  <div className="font-medium">{booking.address}</div>
                </div>
              )}
            </div>

            {booking.items?.length ? (
              <div className="rounded-lg border border-neutral-200">
                <div className="px-4 py-3 text-sm font-semibold bg-neutral-50">Items</div>
                <ul className="divide-y divide-neutral-200">
                  {booking.items.map((it, idx) => (
                    <li key={`${it.name || it.title || "item"}-${idx}`} className="px-4 py-3 flex items-center justify-between text-sm">
                      <span className="text-neutral-800">
                        {it.name || it.title || "Item"}{it.qty ? ` × ${it.qty}` : ""}
                      </span>
                      <span className="text-neutral-700">
                        {typeof it.subtotal === "number" ? `₹${it.subtotal}` : it.price ? `₹${it.price}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {typeof total === "number" && (
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => router.push("/bookings")} className="px-4 py-2 rounded bg-neutral-900 text-white">
            View bookings
          </button>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 rounded bg-orange-600 text-white">
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
