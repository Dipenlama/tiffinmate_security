import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./_providers/cart-provider";
import Navbar from "./_components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiffin Mate",
  description: "Fresh home-style meals delivered on your schedule.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Navbar />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
