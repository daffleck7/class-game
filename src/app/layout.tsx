import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Blitz",
  description: "An interactive classroom icebreaker investment game",
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
