"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "../../../lib/api";
import RectangleImg from "../../assets/images/Rectangle.png";
import food1 from "../../assets/images/food1.png";
import food2 from "../../assets/images/food2.png";
import food3 from "../../assets/images/food3.png";
import food4 from "../../assets/images/food4.png";
import food5 from "../../assets/images/food5.png";
import food6 from "../../assets/images/food6.png";
import food7 from "../../assets/images/food7.png";
import thukpa from "../../assets/images/thukpa.png";

const Hero = () => (
  <section className="max-w-7xl mx-auto px-6 pt-10 pb-8">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl grid md:grid-cols-2 gap-6 items-center p-8">
      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs uppercase tracking-wide">Daily tiffin</div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-sm">Home-style meals, on time.</h1>
        <p className="text-base md:text-lg text-white/90 max-w-xl">Pick a package or book a special—freshly cooked food delivered in neat time slots.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/packages" className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-orange-600 font-semibold shadow-sm hover:-translate-y-0.5 transition">Browse packages</Link>
          <Link href="/menu" className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/15 transition">See today’s menu</Link>
        </div>
      </div>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-white/10 blur-3xl" aria-hidden />
        <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
          <img src={RectangleImg.src} alt="hero" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  </section>
);

const Card = ({ title, subtitle, img, badge }: { title: string; subtitle?: string; img: string; badge?: string }) => (
  <div className="bg-white rounded-xl overflow-hidden shadow-md relative">
    <img src={img} className="w-full h-36 object-cover" />
    {badge && <div className="absolute right-3 top-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{badge}</div>}
    <div className="p-4">
      <div className="text-xs text-neutral-500">Restaurant</div>
      <div className="font-semibold mt-1">{title}</div>
      {subtitle && <div className="text-sm text-neutral-500 mt-1">{subtitle}</div>}
    </div>
  </div>
);

const Categories = () => null;

const Deals = () => null;

const assetHost = API_BASE.replace(/\/api$/, "");

const DashboardPage = () => {
  const [specialItems, setSpecialItems] = useState<Array<{ id: string; name: string; description?: string; price?: number; category?: string; image?: string; available?: boolean }>>([]);
  const [specialLoading, setSpecialLoading] = useState<boolean>(false);
  const [specialFilter, setSpecialFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    const normalize = (list: any[]) => (list || []).map((it: any) => ({
      id: it._id || it.id || it.name,
      name: it.name || it.title || "Item",
      description: it.description,
      price: it.price,
      category: it.category,
      image: it.image,
      available: it.available !== false,
    }));

    const load = async () => {
      setSpecialLoading(true);
      try {
        const paths = [
          `${API_BASE}/items`,
          `${API_BASE}/menu`,
          `/api/items`,
          `/api/menu`,
        ];
        for (const url of paths) {
          try {
            const res = await fetch(url);
            const json = await res.json().catch(() => ({}));
            if (!res.ok) continue;
            const list = Array.isArray(json?.data?.items)
              ? json.data.items
              : Array.isArray(json?.items)
              ? json.items
              : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json)
              ? json
              : [];
            if (active) setSpecialItems(normalize(list));
            return;
          } catch (err) {
            if ((err as any)?.name === 'AbortError') return;
            continue;
          }
        }
        if (active) setSpecialItems([]);
      } catch (e) {
        if (active) setSpecialItems([]);
      } finally {
        if (active) setSpecialLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Package selection: fixed items per package and day
  const packages = ["Veg", "Non-Veg", "Mixed", "Premium"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const packageMenu: Record<string, Record<string, Array<{ id: string; name: string; desc?: string }>>> = {
    "Veg": {
      Mon: [{ id: 'v1', name: 'Paneer Curry' }, { id: 'v2', name: 'Mixed Veg' }],
      Tue: [{ id: 'v3', name: 'Chole Masala' }, { id: 'v4', name: 'Aloo Gobi' }],
      Wed: [{ id: 'v5', name: 'Dal Tadka' }, { id: 'v6', name: 'Jeera Rice' }],
      Thu: [{ id: 'v7', name: 'Palak Paneer' }, { id: 'v8', name: 'Roti' }],
      Fri: [{ id: 'v9', name: 'Veg Biryani' }, { id: 'v10', name: 'Raita' }],
      Sat: [{ id: 'v11', name: 'Methi Malai' }, { id: 'v12', name: 'Paratha' }],
      Sun: [{ id: 'v13', name: 'Navratan Korma' }, { id: 'v14', name: 'Naan' }],
    },
    "Non-Veg": {
      Mon: [{ id: 'n1', name: 'Chicken Curry' }, { id: 'n2', name: 'Egg Fry' }],
      Tue: [{ id: 'n3', name: 'Mutton Curry' }, { id: 'n4', name: 'Fried Fish' }],
      Wed: [{ id: 'n5', name: 'Kadai Chicken' }, { id: 'n6', name: 'Egg Bhurji' }],
      Thu: [{ id: 'n7', name: 'Fish Curry' }, { id: 'n8', name: 'Tandoori Chicken' }],
      Fri: [{ id: 'n9', name: 'Prawn Masala' }, { id: 'n10', name: 'Rice' }],
      Sat: [{ id: 'n11', name: 'Chicken Biryani' }, { id: 'n12', name: 'Salad' }],
      Sun: [{ id: 'n13', name: 'Mixed Grill' }, { id: 'n14', name: 'Naan' }],
    },
    "Mixed": {
      Mon: [{ id: 'm1', name: 'Veg + Egg' }, { id: 'm2', name: 'Salad' }],
      Tue: [{ id: 'm3', name: 'Chicken + Veg' }, { id: 'm4', name: 'Roti' }],
      Wed: [{ id: 'm5', name: 'Dal + Fish' }, { id: 'm6', name: 'Rice' }],
      Thu: [{ id: 'm7', name: 'Paneer + Chicken' }, { id: 'm8', name: 'Naan' }],
      Fri: [{ id: 'm9', name: 'Biryani (Mixed)' }, { id: 'm10', name: 'Raita' }],
      Sat: [{ id: 'm11', name: 'Grill + Veg' }, { id: 'm12', name: 'Paratha' }],
      Sun: [{ id: 'm13', name: 'Special Mixed' }, { id: 'm14', name: 'Dessert' }],
    },
    "Premium": {
      Mon: [{ id: 'p1', name: 'Chef Special Chicken' }, { id: 'p2', name: 'Gourmet Salad' }],
      Tue: [{ id: 'p3', name: 'Lamb Shank' }, { id: 'p4', name: 'Exotic Rice' }],
      Wed: [{ id: 'p5', name: 'Seafood Platter' }, { id: 'p6', name: 'Steamed Veg' }],
      Thu: [{ id: 'p7', name: 'Duck Confit' }, { id: 'p8', name: 'Gourmet Bread' }],
      Fri: [{ id: 'p9', name: 'Lobster' }, { id: 'p10', name: 'Saffron Rice' }],
      Sat: [{ id: 'p11', name: 'Chef Thali' }, { id: 'p12', name: 'Premium Dessert' }],
      Sun: [{ id: 'p13', name: 'Sunday Roast' }, { id: 'p14', name: 'Sides' }],
    },
  };

  const [selectedPackage, setSelectedPackage] = React.useState<string>(packages[0]);
  const [selectedDay, setSelectedDay] = React.useState<string>(days[0]);
  const [selectedItems, setSelectedItems] = React.useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setSelectedItems((s) => ({ ...s, [id]: !s[id] }));
  };

  const filteredSpecials = specialItems.filter((it) => {
    if (specialFilter === 'all') return true;
    const cat = (it.category || '').toLowerCase();
    return cat === specialFilter;
  }).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-neutral-900 font-sans">
      <main className="space-y-6">
        <Hero />
        <Deals />
        <Categories />

        <section className="max-w-7xl mx-auto px-6 py-8">
          <h3 className="text-lg font-semibold mb-4">Choose a Subscription Package</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { key: 'Veg', title: 'Veg', img: food5.src, price: '₹99', features: ['Fresh veggies', 'Protein rich'] },
              { key: 'Non-Veg', title: 'Non-Veg', img: food7.src, price: '₹129', features: ['Daily non-veg', 'High protein'] },
              { key: 'Mixed', title: 'Mixed', img: food3.src, price: '₹149', features: ['Balanced meals', 'Variety'] },
              { key: 'Premium', title: 'Premium', img: thukpa.src, price: '₹199', features: ['Chef curated', 'Gourmet sides'] },
            ].map((p) => (
              <Link key={p.key} href={`/packages/${p.key.toLowerCase().replace(/\s+/g, '-')}`} className="block">
                <div className="relative rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                  <div className="absolute inset-0">
                    <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
                  </div>

                  <div className="relative p-5 flex flex-col h-full text-white">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/80">{p.title} Package</div>
                      <div className="bg-white/15 text-white px-2 py-1 rounded text-xs">Popular</div>
                    </div>

                    <div className="mt-4 flex-1">
                      <div className="text-xl font-bold">{p.title}</div>
                      <div className="text-sm text-white/90 mt-2">{p.features.join(' • ')}</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-white/80">From</div>
                      <div className="text-lg font-semibold">{p.price} / day</div>
                    </div>

                    <div className="mt-4">
                      <button className="w-full bg-white text-orange-600 hover:bg-orange-50 rounded-full px-4 py-2 font-semibold shadow-sm">View package</button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-sm text-neutral-600">Click a package to view day-wise menu and select items by day and time.</div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Special Items</h3>
              <Link href="/menu" className="text-sm px-3 py-1.5 rounded-full bg-orange-600 text-white shadow-sm hover:-translate-y-0.5 transition">View all</Link>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {[{ key: 'all', label: 'All' }, { key: 'veg', label: 'Veg' }, { key: 'non-veg', label: 'Non-Veg' }, { key: 'mixed', label: 'Mixed' }, { key: 'premium', label: 'Premium' }].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSpecialFilter(f.key)}
                  className={`px-3 py-1 rounded-full border transition ${specialFilter === f.key ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-neutral-700 border-neutral-200 hover:border-orange-300'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {specialLoading && <div className="text-neutral-600">Loading items…</div>}
          {!specialLoading && filteredSpecials.length === 0 && (
            <div className="bg-white border border-dashed border-neutral-200 rounded-xl p-6 text-neutral-600">No special items available right now.</div>
          )}
          {!specialLoading && filteredSpecials.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecials.map((it) => {
                const unavailable = it.available === false;
                const price = Number(it.price || 0);
                return (
                  <article key={it.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition ${unavailable ? 'opacity-90' : 'hover:shadow-lg'}`}>
                    <div className="h-44 bg-neutral-100 overflow-hidden relative">
                      <img
                        src={it.image ? (it.image.startsWith('http') ? it.image : `${assetHost}/${it.image.replace(/^\/+/, '')}`) : RectangleImg.src}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = RectangleImg.src; }}
                        alt={it.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-white/85 backdrop-blur text-xs px-3 py-1 rounded-full border border-neutral-200">{it.category || 'Special'}</div>
                      <div className={`absolute top-3 right-3 text-xs px-2 py-1 rounded-full border ${unavailable ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {unavailable ? 'Not bookable' : 'Bookable now'}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-xs text-neutral-500">Special item</div>
                          <h4 className="text-lg font-semibold text-neutral-900 leading-snug">{it.name}</h4>
                          <p className="text-sm text-neutral-600 line-clamp-2">{it.description || 'Freshly prepared by our kitchen.'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-orange-600">{price > 0 ? `₹${price.toFixed(2)}` : '₹—'}</div>
                          <div className={`text-[11px] font-semibold mt-1 px-2 py-1 rounded-full border ${unavailable ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                            {unavailable ? 'Unavailable' : 'Available'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-neutral-500">ID: {it.id}</div>
                        <div className="flex gap-2">
                          <Link href={`/menu/${it.id}`} className="px-3 py-2 border border-neutral-200 rounded-md text-sm text-neutral-800 hover:bg-neutral-50">View</Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
