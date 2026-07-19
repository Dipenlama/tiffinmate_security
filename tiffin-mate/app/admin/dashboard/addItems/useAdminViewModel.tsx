"use client"

import { useState } from "react";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image?: string; // url or data URL
  available: boolean;
};

export function useAdminViewModel() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("main");
  const [price, setPrice] = useState<string | number>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [available, setAvailable] = useState<boolean>(true);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem("admin_items");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Product[];
      return Array.isArray(parsed)
        ? parsed.map((p) => ({
            ...p,
            available: p?.available !== false, // default to true for legacy entries
          }))
        : [];
    } catch {
      return [];
    }
  });

  const handleImageChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("main");
    setPrice("");
    setImageUrl("");
    setAvailable(true);
    setImageDataUrl(undefined);
  };

  const addItem = () => {
    const item: Product = {
      id: String(Date.now()),
      name: name.trim(),
      description: description.trim(),
      category,
      price: Number(price) || 0,
      image: (imageUrl || imageDataUrl || "").trim() || undefined,
      available,
    };
    const next = [item, ...items];
    setItems(next);
    try {
      localStorage.setItem("admin_items", JSON.stringify(next));
    } catch (e) {
      // ignore localStorage errors for now
    }
    resetForm();
  };

  return {
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    price,
    setPrice,
    imageUrl,
    setImageUrl,
    available,
    setAvailable,
    imageDataUrl,
    handleImageChange,
    items,
    addItem,
    resetForm,
  } as const;
}
