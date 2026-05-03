import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/dashboard/Navbar";

export const metadata: Metadata = {
  title: "10X Hunter — Find Explosive Growth Stocks",
  description: "AI-powered stock screener that identifies 10x opportunities using hedge fund-grade analysis",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#050508] text-white antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
