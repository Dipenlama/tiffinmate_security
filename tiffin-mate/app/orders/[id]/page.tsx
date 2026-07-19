'use client';
import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchOrderById } from '../../../lib/api';

export default function OrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || 'unknown');
  const [order, setOrder] = React.useState({ id, items: [{ name: 'Classic Tiffin', qty: 1 }], status: 'Preparing', total: 120 });

  useEffect(() => {
    let mounted = true;
    fetchOrderById(id).then((d) => { if (mounted) setOrder(d); }).catch(() => {
      setOrder({ id, items: [{ name: 'Classic Tiffin', qty: 1 }], status: 'Preparing', total: 120 });
    });
    return () => { mounted = false; };
  }, [id]);

  return (
    <main>
      <h1>Order Details — {id}</h1>
      <p>TODO: fetch order detail from lib/api.ts, show items, status timeline, delivery info</p>
    </main>
  );
}