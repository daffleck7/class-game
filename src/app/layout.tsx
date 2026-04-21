import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Mayhem",
  description: "A classroom auction game demonstrating consumer surplus",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mahogany-950 text-cream-100" style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
    </html>
  );
}
