import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Receipts",
  description: "Local-first receipt intelligence with shopping-aware planning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
