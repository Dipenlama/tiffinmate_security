type CartItem = { id: string; title: string; price?: number; qty: number; category?: string };

const CART_KEY = 'tiffinmate_cart_v1';

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch (e) {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: { id: string; title: string; price?: number; category?: string }, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    cart[idx].qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  saveCart(cart);
}

export function removeFromCart(id: string) {
  const cart = getCart().filter((c) => c.id !== id);
  saveCart(cart);
}

export function updateQty(id: string, qty: number) {
  const cart = getCart();
  const idx = cart.findIndex((c) => c.id === id);
  if (idx >= 0) {
    cart[idx].qty = qty;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(cart);
  }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function cartTotal() {
  return getCart().reduce((s, it) => s + (it.price || 0) * it.qty, 0);
}

export default {};
