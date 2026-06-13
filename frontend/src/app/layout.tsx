import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kapruka Shopper - AI Shopping Assistant",
  description: "Search products, get recommendations, build gift bundles, and checkout with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
