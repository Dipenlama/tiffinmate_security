'use client';
import React, { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartContext } from '../_providers/cart-provider';
import { createBooking } from '../../lib/api';
import { clearCart } from '../../lib/cart';

export default function CheckoutPage() {
  const { items } = useContext(CartContext);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const placeOrder = async () => {
    if (!address) return alert('Enter address');
    setSubmitting(true);
    try {
      // create booking on backend using createBooking helper
      const allowedPackages = ['Veg','Non-Veg','Mixed','Premium'];
      const defaultPackage = allowedPackages[0];
      const draft = {
        items,
        total: (items || []).reduce((s:any,it:any)=>s + ((it.price||0) * (it.qty||1)), 0),
        day: 'Mon',
        time: 'Lunch',
        frequency: 'once',
        package: defaultPackage,
        packageName: `${defaultPackage} Plan`,
        address,
        draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
      };
      const res: any = await createBooking(draft as any, draft.draftId);
      const bookingId = res?.data?._id || res?.data?.id || res?.data;
      if (!res.ok) {
        if (res.status === 409) {
          // booking already exists, use returned booking
          // continue to orders page
        } else if (res.status === 400) {
          alert('Validation error: ' + JSON.stringify(res.data));
          return;
        } else {
          alert('Failed to create booking: ' + JSON.stringify(res.data));
          return;
        }
      }
      clearCart();
      // if backend returns booking id, navigate to orders or to confirm success
      if (bookingId) router.push('/orders');
      else router.push('/packages/confirm/success');
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      <p className="mb-4">Items: {items.length}</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-700 mb-1">Delivery address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>

        <div>
          <label className="block text-sm text-neutral-700 mb-1">Payment</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border px-3 py-2 rounded">
            <option value="cod">Cash on Delivery</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div>
          <button onClick={placeOrder} disabled={submitting} className="px-4 py-2 bg-orange-600 text-white rounded">
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </div>
    </main>
  );
}