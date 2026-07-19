import { addToCart, getCart, clearCart, updateQty, removeFromCart, cartTotal } from '../lib/cart';

declare const global: any;

describe('cart utilities', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    clearCart();
  });

  test('getCart returns empty array when nothing stored', () => {
    expect(getCart()).toEqual([]);
  });

  test('addToCart adds a new item', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 2);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ id: '1', title: 'Item 1', qty: 2, price: 10 });
  });

  test('addToCart increments quantity when item exists', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 1);
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 3);
    const cart = getCart();
    expect(cart[0].qty).toBe(4);
  });

  test('removeFromCart removes the specified item', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 1);
    addToCart({ id: '2', title: 'Item 2', price: 5 }, 1);
    removeFromCart('1');
    const ids = getCart().map((c) => c.id);
    expect(ids).toEqual(['2']);
  });

  test('updateQty changes quantity', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 1);
    updateQty('1', 5);
    expect(getCart()[0].qty).toBe(5);
  });

  test('updateQty removes item when quantity becomes zero', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 1);
    updateQty('1', 0);
    expect(getCart()).toHaveLength(0);
  });

  test('clearCart empties the cart', () => {
    addToCart({ id: '1', title: 'Item 1', price: 10 }, 1);
    clearCart();
    expect(getCart()).toEqual([]);
  });

  test('cartTotal sums price times qty', () => {
    addToCart({ id: '1', title: 'A', price: 10 }, 2);
    addToCart({ id: '2', title: 'B', price: 5 }, 1);
    expect(cartTotal()).toBe(25);
  });

  test('cartTotal treats missing price as zero', () => {
    addToCart({ id: '1', title: 'A' }, 3);
    expect(cartTotal()).toBe(0);
  });

  test('getCart handles invalid JSON gracefully', () => {
    global.localStorage.setItem('tiffinmate_cart_v1', 'not-json');
    expect(getCart()).toEqual([]);
  });
});
