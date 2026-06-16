import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayojit Intelligence",
  description: "Unified AIKosh open-license AI stack suite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
