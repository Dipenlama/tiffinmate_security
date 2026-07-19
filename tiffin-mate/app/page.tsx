"use client";

import React from "react";
import { useRouter } from "next/navigation";
import RectangleImg from "./assets/images/Rectangle.png";
import food1 from "./assets/images/food1.png";
import food2 from "./assets/images/food2.png";
import food3 from "./assets/images/food3.png";
import food4 from "./assets/images/food4.png";
import food5 from "./assets/images/food5.png";
import food6 from "./assets/images/food6.png";
import food7 from "./assets/images/food7.png";
import thukpa from "./assets/images/thukpa.png";

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

const Deals = () => (
  <section className="max-w-7xl mx-auto px-6 py-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Up to -40% 🎉 Order exclusive deals</h3>
      <div className="flex gap-3 text-sm text-neutral-600">
        <button className="px-3 py-1 rounded-full border">Vegan</button>
        <button className="px-3 py-1 rounded-full border">Sushi</button>
        <button className="px-3 py-1 rounded-full bg-orange-600 text-white">Pizza & Fast food</button>
        <button className="px-3 py-1 rounded-full border">others</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Card title="Chef Burgers London" img={food7.src} badge="-40%" />
      <Card title="Grand Ai Cafe London" img={food4.src} badge="-20%" />
      <Card title="Butterbrot Caf'e London" img={thukpa.src} badge="-17%" />
    </div>
  </section>
);

const Categories = () => (
  <div className="max-w-7xl mx-auto px-6 py-8">
    <h3 className="text-lg font-semibold mb-4">Order Popular Categories</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {[
        { name: "Burgers & Fast food", img: food1.src },
        { name: "Salads", img: food2.src },
        { name: "Pasta & Casuals", img: food3.src },
        { name: "Pizza", img: food4.src },
        { name: "Breakfast", img: food5.src },
        { name: "Soups", img: food6.src },
      ].map((c) => (
        <div key={c.name} className="bg-white rounded-lg p-3 flex flex-col items-center gap-2 text-center shadow-sm">
          <div className="w-20 h-20 rounded-lg overflow-hidden">
            <img src={c.img} className="w-full h-full object-cover" />
          </div>
          <div className="text-sm font-medium">{c.name}</div>
          <div className="text-xs text-neutral-500">32 Restaurants</div>
        </div>
      ))}
    </div>
  </div>
);

const Hero: React.FC = () => {
  const router = useRouter();
  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg grid md:grid-cols-2 gap-6 items-center p-6">
        <div className="p-6">
          <p className="text-sm text-neutral-500 mb-2">Order food on a tiffin basis.</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 leading-tight">Feast Your Senses, <span className="text-orange-600">With Tiffin Mate</span></h1>
          <p className="mt-4 text-sm text-neutral-600">Choose from our delicious home-style meals</p>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <input className="flex-1 min-w-[200px] border border-neutral-200 rounded-full px-4 py-3" placeholder="Search menu" />
            <button className="px-6 py-3 rounded-full bg-orange-600 text-white font-medium" onClick={() => router.push('/menu')}>Search</button>
            <button className="px-6 py-3 rounded-full border border-neutral-200 text-neutral-900 font-semibold ml-2" onClick={() => router.push('/login')}>Get Started</button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute right-0 top-0 -translate-y-8 w-72 h-72 md:w-96 md:h-96 rounded-l-full bg-orange-600/95"></div>
          <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-xl">
            <img src={RectangleImg.src} alt="hero" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <main>
        <Hero />
        <Deals />
        <Categories />
      </main>
    </div>
  );
};

export default HomePage;
