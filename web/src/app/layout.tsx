import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SURGE — Self-Sustaining Liquidity Engine",
  description: "Launch tokens with automatic buybacks and self-sustaining liquidity. The future of token launches.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased noise">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
