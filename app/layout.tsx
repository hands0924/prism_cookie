import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism Fortune Cookie",
  description: "Supabase + Vercel migration starter for Bake your future"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
