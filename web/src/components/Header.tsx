"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

export function Header() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'glass' : 'bg-transparent'
    }`}>
      <nav className="container flex items-center justify-between py-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="w-3 h-3 bg-[var(--lime)]" />
          <span className="font-display text-2xl tracking-wider">LAUNCHLABS</span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-12">
          {[
            { href: "/launch", label: "Launch" },
            { href: "/tokens", label: "Explore" },
            { href: "/docs", label: "Docs" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 border border-[var(--grey-300)] hover:border-[var(--lime)] transition-colors"
                  >
                    <span className="w-6 h-6 bg-[var(--lime)] flex items-center justify-center text-xs font-bold text-black">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline text-sm font-medium">{user.username}</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="nav-link">
                    Login
                  </Link>
                  <Link href="/register" className="btn btn-primary py-3 px-6 text-xs">
                    Get Started
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
