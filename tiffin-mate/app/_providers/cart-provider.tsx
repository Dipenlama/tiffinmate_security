'use client';
import React, { createContext, useState, ReactNode } from 'react';

export type CartItem = { id: string; name: string; price?: number; qty: number };
export const CartContext = createContext({
  items: [] as CartItem[],
  addItem: (item: CartItem) => {},
  updateQty: (id: string, qty: number) => {},
  removeItem: (id: string) => {},
  clear: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const addItem = (item: CartItem) => {
    setItems((s) => {
      const exists = s.find((i) => i.id === item.id);
      if (exists) return s.map((i) => (i.id === item.id ? { ...i, qty: i.qty + item.qty } : i));
      return [...s, item];
    });
  };
  const updateQty = (id: string, qty: number) => setItems((s) => s.map((i) => (i.id === id ? { ...i, qty } : i)));
  const removeItem = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}