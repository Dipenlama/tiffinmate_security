'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '../../lib/api';

type MenuItem = { id: string; name: string; description?: string; price?: number; category?: string; image?: string; available?: boolean };

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';
const assetHost = API_BASE.replace(/\/api$/, "");

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
        const params = new URLSearchParams({ page: String(safePage), limit: String(safeLimit) });
        if (search.trim()) params.set('q', search.trim());
        if (category && category !== 'All') params.set('category', category);

        const attemptPaths = [`${API_BASE}/items?${params.toString()}`, `${API_BASE}/menu`, `/api/items?${params.toString()}`, `/api/menu`];
        let lastErr: string | null = null;

        for (const url of attemptPaths) {
          try {
            const res = await fetch(url, { signal: controller.signal });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
              lastErr = json?.message || json?.error || res.statusText;
              continue;
            }
            const listRaw = Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
            const normalized: MenuItem[] = (listRaw || []).map((it: any) => ({
              id: it._id || it.id || it.name,
              name: it.name || it.title || 'Item',
              description: it.description,
              price: it.price,
              category: it.category,
              image: it.image,
              available: it.available !== false,
            }));
            const total = json?.data?.totalPages || json?.totalPages || json?.data?.total_pages || 1;
            if (active) {
              setItems(normalized);
              setTotalPages(Math.max(1, total || 1));
            }
            return; // success
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            lastErr = err?.message || 'Failed to load items';
          }
        }

        if (active) {
          setError(lastErr || 'Failed to load items');
          setItems([]);
          setTotalPages(1);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (active) { setError('Failed to load items'); setItems([]); setTotalPages(1); }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; controller.abort(); };
  }, [page, limit, search, category]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((it) => { if (it.category) cats.add(it.category); });
    return ['All', ...Array.from(cats)];
  }, [items]);

  const visible = items; // items already filtered by API params

  return (
    <main className="min-h-screen bg-orange-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="relative overflow-hidden rounded-2xl bg-orange-500 text-white px-6 py-8 shadow-lg">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_30%),radial-gradient(circle_at_80%_0%,white_0,transparent_25%)]" aria-hidden />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="uppercase tracking-[0.18em] text-xs font-semibold text-white/80">Chef-crafted</p>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-sm">Browse Our Menu</h1>
              <p className="mt-3 text-lg text-white/90 max-w-2xl">Home-style meals delivered with restaurant polish. Pick a day, pick a time, and we will handle the rest.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Zero prep</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Freshly cooked</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Delivery slots every hour</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-sm text-white/90 bg-white/10 px-3 py-2 rounded-lg border border-white/20 shadow-sm">Freshly cooked, zero prep</div>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-8 mb-6">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Search menu</label>
              <div className="mt-1 flex items-center gap-2 bg-white border border-neutral-200 shadow-sm rounded-xl px-3 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-500"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.5"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input
                  aria-label="Search menu"
                  placeholder="Paneer, biryani, pasta…"
                  className="w-full bg-transparent outline-none text-neutral-800 placeholder:text-neutral-400"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex gap-2 bg-white p-2 rounded-full shadow-sm border border-neutral-100">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setPage(1); }}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition ${category === c ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="min-h-[40vh]">
          {error && <div className="text-center text-red-600 bg-white border border-red-200 rounded-2xl py-12" role="alert">{error}</div>}
          {!error && loading && <div className="text-center text-neutral-600 bg-white border border-neutral-200 rounded-2xl py-12">Loading items…</div>}
          {!error && !loading && visible.length === 0 ? (
            <div className="text-center text-neutral-600 bg-white border border-dashed border-neutral-200 rounded-2xl py-12">No items match your filters</div>
          ) : (!error && !loading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((it) => (
                <article key={it.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-xl hover:-translate-y-1 transition overflow-hidden">
                  <div className="h-48 bg-neutral-100 overflow-hidden relative">
                    <img
                      src={it.image ? (it.image.startsWith('http') ? it.image : `${assetHost}/${it.image.replace(/^\/+/, '')}`) : `/assets/images/${(it.id||'placeholder').toString().split('-')[0]}.jpg`}
                      onError={(e)=>{(e.currentTarget as HTMLImageElement).src=FALLBACK_IMG;}}
                      alt={it.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-white/85 backdrop-blur text-xs px-3 py-1 rounded-full border border-neutral-200">{it.category || 'Featured'}</div>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-neutral-900 leading-snug">{it.name}</h3>
                        <p className="text-sm text-neutral-600 line-clamp-2">{it.description || 'Freshly prepared meal crafted by our chefs.'}</p>
                      </div>
                      <div className="text-right ml-2 flex flex-col items-end">
                        <div className="text-xl font-bold text-orange-600">₹{(Number(it.price||0)).toFixed(2)}</div>
                        <div className={`text-[11px] font-semibold mt-1 px-2 py-1 rounded-full border ${it.available === false ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                          {it.available === false ? 'Unavailable' : 'In stock'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <Link href={`/menu/${it.id}`} className="px-3 py-2 border border-neutral-200 rounded-md text-sm text-neutral-800 hover:bg-neutral-50">View</Link>
                      </div>
                      <div className="text-[11px] text-neutral-500">ID: {it.id}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {!error && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-2 border rounded disabled:opacity-50">Prev</button>
              <div className="text-sm text-neutral-700">Page {page} / {totalPages}</div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
              <select value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)||12); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                {[6,12,18,24].map((n)=> <option key={n} value={n}>{n}/page</option>)}
              </select>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}