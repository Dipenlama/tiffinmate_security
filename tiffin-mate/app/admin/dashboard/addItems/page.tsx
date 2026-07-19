"use client"

import React, { ChangeEvent } from "react";
import styles from "./styles.module.css";
import { useAdminViewModel } from "./useAdminViewModel";

export default function AdminPage() {
  const vm = useAdminViewModel();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) vm.handleImageChange(f);
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>TiffinMate</div>
        <div className={styles.menuItem}>+ Add Items</div>
        <div className={styles.menuItem}>List Items</div>
        <div className={styles.menuItem}>Orders</div>
        <div className={styles.menuItem}>Subscriptions</div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div>
            <h2 style={{ margin: 0, color: "#2f2f2f" }}>Admin Panel</h2>
            <div className={styles.muted}>Manage products and orders</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className={styles.muted}>Signed in as Admin</div>
            <div className={styles.avatar}>A</div>
          </div>
        </div>

        <div className={styles.formBox}>
          <label className={styles.labelSmall}>Image URL</label>
          <input
            className={styles.input}
            value={vm.imageUrl}
            onChange={(e) => vm.setImageUrl(e.target.value)}
            placeholder="https://example.com/paneer.jpg"
          />

          <div className={styles.muted} style={{ marginBottom: 12 }}>Or upload to preview; we will still send the URL string in the payload.</div>
          <div className={styles.uploadBox} onClick={() => document.getElementById("file-input")?.click()}>
            {vm.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vm.imageDataUrl} alt="preview" className={styles.uploadPreview} />
            ) : (
              <div className={styles.muted}>Click to upload</div>
            )}
            <input id="file-input" className={styles.uploadInput} type="file" accept="image/*" onChange={onFileChange} />
          </div>

          <label className={styles.labelSmall}>Product name</label>
          <input
            className={styles.input}
            value={vm.name}
            onChange={(e) => vm.setName(e.target.value)}
            placeholder="Type here"
          />

          <label className={styles.labelSmall}>Product description</label>
          <textarea
            className={styles.textarea}
            value={vm.description}
            onChange={(e) => vm.setDescription(e.target.value)}
            placeholder="Write content here"
          />

          <div style={{ height: 8 }} />
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
              <label className={styles.labelSmall}>Product category</label>
              <select className={styles.select} value={vm.category} onChange={(e) => vm.setCategory(e.target.value)}>
                <option value="veg">Veg</option>
                <option value="non-veg">Non Veg</option>
                <option value="mixed">Mixed</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div style={{ width: 160 }}>
              <label className={styles.labelSmall}>Product Price</label>
              <input
                className={styles.input}
                value={String(vm.price)}
                onChange={(e) => vm.setPrice(e.target.value)}
                placeholder="199"
              />
            </div>

            <div style={{ width: 160 }}>
              <label className={styles.labelSmall}>Availability</label>
              <select className={styles.select} value={vm.available ? "true" : "false"} onChange={(e) => vm.setAvailable(e.target.value === "true")}>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
            <button className={styles.addBtn} onClick={() => vm.addItem()}>
              ADD
            </button>
            <div className={styles.muted}>Items added: {vm.items.length}</div>
          </div>

          <div className={styles.cardList}>
            {vm.items.map((it) => (
              <div className={styles.cardItem} key={it.id}>
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className={styles.thumb} />
                ) : (
                  <div style={{ width: 72, height: 56, borderRadius: 6, background: "#fff3ef", display: "flex", alignItems: "center", justifyContent: "center", color: "#e64a19", fontWeight: 700 }}>T</div>
                )}
                <div className={styles.cardInfo}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{it.name || "Untitled"}</div>
                    <div style={{ color: "#6b6b6b" }}>${it.price}</div>
                  </div>
                  <div className={styles.muted} style={{ marginTop: 6 }}>{it.description}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={styles.categoryTag}>{it.category}</span>
                    <span className={styles.badge}>{it.available ? "Available" : "Unavailable"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
