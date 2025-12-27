"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-cream)]/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 lg:px-12">
        <nav className="flex items-center justify-between py-5 border-b border-[var(--ink)]/5">
          {/* Logo */}
          <Link 
            href="/" 
            className="group flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="font-serif text-xl tracking-tight text-[var(--ink)]">
              Crosspad
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "/launch", label: "Launch" },
              { href: "/tokens", label: "Tokens" },
              { href: "/docs", label: "Docs" },
            ].map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`relative px-5 py-2 text-sm transition-colors duration-300 ${
                  pathname === link.href 
                    ? 'text-[var(--ink)]' 
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-5 right-5 h-[2px] bg-[var(--accent)]" />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link 
              href="https://twitter.com" 
              target="_blank"
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors text-sm hidden sm:block"
            >
              Twitter
            </Link>
            <WalletButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
