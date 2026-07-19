"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { days, packageMenu, vegFixedPackages, nonVegFixedPackages, mixedFixedPackages, premiumFixedPackages } from "../data";
import placeholderImg from "../../assets/images/food1.png";
import { API_BASE } from "../../../lib/api";

const times = ["Breakfast", "Lunch", "Dinner"];
const assetHost = API_BASE.replace(/\/api$/, "");

const fixedByKey: Record<string, any[]> = {
  'veg': vegFixedPackages,
  'non-veg': nonVegFixedPackages,
  'mixed': mixedFixedPackages,
  'premium': premiumFixedPackages,
};

export default function PackagePage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug as string | string[] | undefined;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] ?? "" : rawSlug ?? "";
  const packageName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const packageKey = slug.toLowerCase();
  const fixedList = fixedByKey[packageKey] || [];
  const isFixedPackage = fixedList.length > 0;
  const defaultDay = isFixedPackage && fixedList[0]?.dayOrder?.[0] ? fixedList[0].dayOrder[0] : days[0];

  const [selectedFixedPackageId, setSelectedFixedPackageId] = useState<string>(isFixedPackage ? (fixedList[0]?.id || '') : '');
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [selectedTime, setSelectedTime] = useState<string>(times[0]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [apiItemsMap, setApiItemsMap] = useState<Record<string, any>>({});

  const selectedFixedPackage = isFixedPackage ? (fixedList.find(p => p.id === selectedFixedPackageId) || fixedList[0]) : null;
  const dayLabels = selectedFixedPackage ? selectedFixedPackage.dayOrder : days;
  const packageLabel = isFixedPackage && selectedFixedPackage ? selectedFixedPackage.name : packageName;

  useEffect(() => {
    let active = true;
    const fetchItems = async () => {
        const paths = [`${API_BASE}/items`, `${API_BASE}/menu`, `/api/items`, `/api/menu`];
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
                if (active) {
                  const map = (list as any[]).reduce((acc, it: any) => {
                    const id = it._id || it.id || it.name;
                    if (!id) return acc;
                    acc[id] = {
                      ...it,
                      id,
                      name: it.name || it.title || id,
                      category: it.category,
                      price: it.price,
                      image: it.image,
                    };
                    return acc;
                  }, {} as Record<string, any>);
                  setApiItemsMap(map);
                }
                return;
            } catch (e) {
                continue;
            }
        }
    };
    fetchItems();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dayLabels.includes(selectedDay)) {
      setSelectedDay(dayLabels[0] || defaultDay);
    }
  }, [dayLabels.join('|')]);

  useEffect(() => {
    if (isFixedPackage) {
      const first = fixedList[0];
      setSelectedFixedPackageId((prev) => fixedList.some(p => p.id === prev) ? prev : (first?.id || ''));
      if (first?.dayOrder?.length) setSelectedDay(first.dayOrder[0]);
    }
  }, [isFixedPackage, slug, fixedList.map(p => p.id).join('|')]);

  const getPrice = (id: string, fallback?: number) => {
    if (fallback !== undefined) return `₹${Number(fallback || 0).toFixed(2)}`;
    if (!id) return '₹99';
    const prefix = id[0];
    switch (prefix) {
      case 'v': return '₹99';
      case 'n': return '₹129';
      case 'm': return '₹149';
      case 'p': return '₹199';
      default: return '₹119';
    }
  };

  const incQty = (id: string) => setQuantities(q => ({ ...q, [id]: (q[id] || 0) + 1 }));
  const decQty = (id: string) => setQuantities(q => ({ ...q, [id]: Math.max(0, (q[id] || 0) - 1) }));
  const addToSelection = (id: string) => setSelectedItems(s => ({ ...s, [id]: true }));

  const pkgKey = Object.keys(packageMenu).find(k => k.toLowerCase() === packageName.toLowerCase()) || packageName;
  const items = selectedFixedPackage
    ? (selectedFixedPackage.days as any)[selectedDay] || []
    : (packageMenu as any)[pkgKey]?.[selectedDay] || [];

  const mergeItems = (list: Array<{ id: string; name: string; qty: number; price: number; subtotal: number }>) => {
    return Object.values(list.reduce((acc, it) => {
      const existing = acc[it.id];
      if (existing) {
        const qty = (existing.qty || 0) + (it.qty || 0);
        const subtotal = (existing.subtotal || 0) + (it.subtotal || 0);
        acc[it.id] = { ...existing, qty, subtotal };
      } else {
        acc[it.id] = { ...it };
      }
      return acc;
    }, {} as Record<string, any>));
  };

  const toggle = (id: string) => setSelectedItems(s => ({ ...s, [id]: !s[id] }));
  const saveBookingAndProceed = () => {
    if (isFixedPackage) {
      const pkg = selectedFixedPackage || fixedList[0];
      if (!pkg) return alert('No packages available');
      const allItems = pkg.dayOrder.flatMap((d: string) => ((pkg.days as any)[d] || []).map((it: any) => ({ ...it, day: d })));
      const bookingItems = allItems.map((it: any) => {
        const apiPrice = apiItemsMap[it.id]?.price;
        const priceStr = apiPrice !== undefined ? String(apiPrice) : getPrice(it.id).replace('₹', '') || '0';
        const price = Number(priceStr) || 0;
        return { id: it.id, name: `${it.name} (${it.day})`, qty: 1, price, subtotal: price };
      });
      const merged = mergeItems(bookingItems);
      const total = merged.reduce((s, it) => s + it.subtotal, 0);

      // Collapse to a single line item to avoid clutter in confirmation
      const consolidated = [{
        id: pkg.id,
        name: `${pkg.name} (Sun–Fri set)` ,
        qty: 1,
        price: total,
        subtotal: total,
      }];

      const booking = {
        package: packageName,
        packageName: pkg.name,
        fixedPackageId: pkg.id,
        day: 'Sun–Fri',
        days: pkg.dayOrder,
        time: 'Any',
        items: consolidated,
        total,
        createdAt: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem('bookingDraft', JSON.stringify(booking));
        router.push('/packages/confirm');
      } catch (e) {
        console.error(e);
        alert('Could not save booking draft.');
      }
      return;
    }

    const selected = Object.keys(selectedItems).filter(k => selectedItems[k]);
    if (selected.length === 0) {
      // nothing selected, still allow proceeding with quantities >0
      const withQty = Object.keys(quantities).filter(k => (quantities as any)[k] > 0);
      if (withQty.length === 0) return alert('Please select at least one item or increase quantity.');
    }

    const itemsRaw = (Object.keys(selectedItems).length > 0 ? Object.keys(selectedItems).filter(k => selectedItems[k]) : Object.keys(quantities).filter(k => (quantities as any)[k] > 0)).map(id => {
      const pkgItems = selectedFixedPackage ? (selectedFixedPackage.days as any)[selectedDay] || [] : (packageMenu as any)[pkgKey]?.[selectedDay] || [];
      const meta = pkgItems.find((x: any) => x.id === id) || { name: id };
      const qty = quantities[id] || 1;
      const apiPrice = apiItemsMap[id]?.price;
      const priceStr = apiPrice !== undefined ? String(apiPrice) : getPrice(id).replace('₹', '') || '0';
      const price = Number(priceStr) || 0;
      return { id, name: meta.name || id, qty, price, subtotal: qty * price };
    });

    const items = mergeItems(itemsRaw);
    const total = items.reduce((s, it) => s + it.subtotal, 0);

    const booking = {
      package: pkgKey,
      packageName: packageLabel,
      fixedPackageId: selectedFixedPackageId || undefined,
      day: selectedDay,
      days: [selectedDay],
      time: selectedTime,
      items,
      total,
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem('bookingDraft', JSON.stringify(booking));
      router.push('/packages/confirm');
    } catch (e) {
      console.error(e);
      alert('Could not save booking draft.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{packageLabel} Package</div>
          <div className="text-sm text-neutral-600">{isFixedPackage ? 'Pick one of the fixed menus (Sun–Fri).' : 'Select items by day and time'}</div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="text-sm text-neutral-600">Back to Dashboard</Link>
          <button onClick={() => router.push('/menu')} className="px-3 py-1 bg-orange-600 text-white rounded">Browse Menu</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {isFixedPackage ? (
          <div className="space-y-6">
            <div className="text-sm text-neutral-700">Choose one of the fixed menus. Items are pre-set for Sun–Fri.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fixedList.map((pkg) => {
                const active = pkg.id === selectedFixedPackageId;
                return (
                  <div key={pkg.id} className={`border rounded-xl p-4 bg-white shadow-sm ${active ? 'border-neutral-900 shadow-md' : 'border-neutral-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{pkg.name}</div>
                        <div className="text-xs text-neutral-500">Sun–Fri fixed menu</div>
                      </div>
                      <input
                        type="radio"
                        name="veg-package"
                        checked={active}
                        onChange={() => setSelectedFixedPackageId(pkg.id)}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="mt-3 space-y-2 max-h-60 overflow-auto pr-1">
                      {pkg.dayOrder.map((d: string) => (
                        <div key={d} className="border border-neutral-100 rounded-lg p-2 bg-neutral-50">
                          <div className="text-xs font-semibold text-neutral-700">{d}</div>
                          <div className="mt-1 space-y-1 text-sm text-neutral-800">
                            {((pkg.days as any)[d] || []).map((it: any) => (
                              <div key={it.id} className="flex items-center justify-between">
                                <span>{it.name}</span>
                                <span className="text-[11px] text-neutral-500">ID: {it.id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="mt-4 w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-semibold"
                      onClick={() => { setSelectedFixedPackageId(pkg.id); saveBookingAndProceed(); }}
                    >
                      Choose {pkg.name}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={saveBookingAndProceed} className="px-4 py-2 bg-orange-600 text-white rounded">Proceed with selected</button>
              <Link href="/dashboard" className="px-4 py-2 border rounded bg-white">Back</Link>
            </div>
          </div>
        ) : (
        <>
        <div className="flex gap-4 mb-4">
          {dayLabels.map((d: string) => (
            <button key={d} onClick={() => setSelectedDay(d)} className={`px-3 py-1 rounded ${selectedDay===d? 'bg-neutral-900 text-white' : 'bg-white'}`}>
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          {times.map(t => (
            <button key={t} onClick={() => setSelectedTime(t)} className={`px-3 py-1 rounded ${selectedTime===t? 'bg-orange-600 text-white' : 'bg-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((it: any) => {
            const apiItem = apiItemsMap[it.id];
            const firstWord = (apiItem?.name || it.name || '').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const imageMap: Record<string, string> = {
              paneer: '/assets/images/placeholder.svg',
              mixed: '/assets/images/placeholder.svg',
            };
            const resolvedImage = apiItem?.image
              ? (apiItem.image.startsWith('http') ? apiItem.image : `${assetHost}/${apiItem.image.replace(/^\/+/, '')}`)
              : imageMap[firstWord] || '/assets/images/placeholder.svg';
            const price = getPrice(it.id, apiItem?.price);
            const qty = quantities[it.id] || 0;

            return (
              <div key={it.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
                <div className="w-full h-44 overflow-hidden">
                  <img src={resolvedImage} onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderImg.src; }} alt={it.name} className="w-full h-full object-cover" />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-semibold text-lg">{it.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">{packageLabel} • {selectedTime} • {selectedDay}</div>
                    <p className="text-sm text-neutral-600 mt-3">A tasty serving of {it.name.toLowerCase()} prepared fresh each {selectedDay}. (Sample description)</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="text-orange-600 font-bold">{price}</div>
                      <div className="flex items-center border rounded-full overflow-hidden">
                        <button onClick={() => decQty(it.id)} className="px-3 py-1 text-lg">−</button>
                        <div className="px-4 py-1 min-w-[44px] text-center">{qty}</div>
                        <button onClick={() => incQty(it.id)} className="px-3 py-1 text-lg">+</button>
                      </div>
                    </div>

                    <div>
                      <button onClick={() => addToSelection(it.id)} className={`px-4 py-2 rounded-full text-white ${selectedItems[it.id] ? 'bg-neutral-700' : 'bg-orange-600 hover:bg-orange-700'}`}>{selectedItems[it.id] ? 'Selected' : 'Add'}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <div className="w-full max-w-7xl px-6">
            <div className="bg-white rounded-full shadow-lg p-4 flex items-center justify-between">
              <div className="text-sm text-neutral-600">{Object.keys(selectedItems).filter(k => selectedItems[k]).length} selected</div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border rounded" onClick={() => { try { sessionStorage.setItem('bookingDraft', JSON.stringify({ savedAt: new Date().toISOString(), package: pkgKey })); alert('Saved draft'); } catch(e){}}}>Save for later</button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={saveBookingAndProceed}>Proceed</button>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
