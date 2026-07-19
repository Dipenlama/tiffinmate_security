'use client';
import React, { useEffect, useState } from 'react';
import { fetchOrders } from '../../lib/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchOrders().then((d) => { if (mounted) setOrders(Array.isArray(d) ? d : []); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <main>
      <h1>My Orders</h1>
      <p>TODO: fetch user's orders from lib/api.ts and render list with status and links to /orders/[id]</p>
    </main>
  );
}