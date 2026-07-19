'use client';
import React, { useState, useEffect } from 'react';
import { fetchAddresses, addAddress } from '../../../lib/api';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [value, setValue] = useState('');
  useEffect(() => {
    let mounted = true;
    fetchAddresses().then((d) => { if (mounted && Array.isArray(d)) setAddresses(d); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const add = async () => {
    if (!value) return;
    try {
      await addAddress(value);
      setAddresses((s) => [...s, value]);
      setValue('');
    } catch {
      alert('Failed to add address');
    }
  };

  return (
    <main>
      <h1>Addresses</h1>
      <ul>
        {addresses.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="New address" />
      <button
        onClick={add}
      >
        Add
      </button>
    </main>
  );
}