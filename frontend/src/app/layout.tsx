import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kapruka AI Shop",
  description: "A polished MCP-powered shopping assistant for Kapruka",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
