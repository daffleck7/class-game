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
      <body className="min-h-screen bg-gray-950 text-white">{children}</body>
    </html>
  );
}
