import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import { AuthProvider } from "@/components/AuthContext";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAUNCHLABS",
  description: "The token launchpad. Deploy on Pump.fun with automated buyback, burn, and liquidity features.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "LAUNCHLABS",
    description: "The token launchpad.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LAUNCHLABS",
    description: "The token launchpad.",
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
        <AuthProvider>
          <WalletProvider>
            <SmoothScroll>{children}</SmoothScroll>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
