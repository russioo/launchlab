"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const navigation = [
  { name: "Overview", href: "/" },
  { name: "Launch", href: "/launch" },
  { name: "Learn", href: "/docs" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="glass rounded-full px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <img 
                src="/logo.png" 
                alt="Surge" 
                className="w-9 h-9 rounded-full shadow-lg shadow-[var(--coral)]/20 transition-transform group-hover:scale-105"
              />
              <span className="font-display text-xl tracking-tight bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] bg-clip-text text-transparent">
                surge
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 bg-white/50 rounded-full p-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white shadow-md shadow-[var(--coral)]/20"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white/80"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <WalletButton />
              </div>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-full bg-white/50 flex items-center justify-center transition-colors hover:bg-white/80"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-5 mt-2 glass rounded-3xl p-4 animate-scale-in">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-5 py-3 rounded-2xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-white/50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-3 px-2">
                <WalletButton />
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
