'use client';
import React, { useEffect, useState } from 'react';
import { fetchAdminOrders, updateAdminOrderStatus } from '../../../lib/api';

type Order = {
  id: string | number;
  status: string;
  customerName?: string;
  total?: number;
  createdAt?: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAdminOrders()
      .then((d) => { if (mounted && Array.isArray(d)) setOrders(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function handleUpdate(id: string | number, status: string) {
    try {
      setUpdating(String(id));
      await updateAdminOrderStatus(String(id), status);
      // refresh list
      const fresh = await fetchAdminOrders();
      if (Array.isArray(fresh)) setOrders(fresh as Order[]);
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Admin — Orders</h1>
        </div>

        {loading && <div>Loading orders…</div>}

        {!loading && orders.length === 0 && <div className="text-sm text-neutral-600">No orders found.</div>}

        <ul className="space-y-4">
          {orders.map(order => (
            <li key={order.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Order {order.id}</div>
                <div className="text-sm text-neutral-600">{order.customerName || '—'} • ₹{order.total || '0'} • {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded text-sm ${order.status==='accepted' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-800'}`}>{order.status}</div>
                <button disabled={!!updating} onClick={() => handleUpdate(order.id, 'accepted')} className="px-3 py-1 border rounded text-sm">Accept</button>
                <button disabled={!!updating} onClick={() => handleUpdate(order.id, 'dispatched')} className="px-3 py-1 border rounded text-sm">Dispatch</button>
                <button disabled={!!updating} onClick={() => handleUpdate(order.id, 'delivered')} className="px-3 py-1 border rounded text-sm">Deliver</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
