import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "CROSSPAD — Launch on Any Platform",
  description: "The universal token launchpad. Launch across Pump.fun, Bags, Bonk & more with customizable features like buyback, burn, jackpot, and auto-liquidity.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "CROSSPAD — Launch on Any Platform",
    description: "The universal token launchpad. Cross any pad. Launch anywhere.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CROSSPAD",
    description: "Cross any pad. Launch anywhere.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </WalletProvider>
      </body>
    </html>
  );
}
