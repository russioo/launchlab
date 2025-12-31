"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getTokens, type Token } from "@/lib/api";
import { motion } from "framer-motion";

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await getTokens({ status: filter || undefined });
        setTokens(data.tokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const filteredTokens = tokens.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q) || t.mint?.toLowerCase().includes(q);
  });

  const filterOptions = [
    { value: null, label: "ALL" },
    { value: "live", label: "GRADUATED" },
    { value: "bonding", label: "BONDING" },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-small text-[var(--lime)] mb-4 block">Explore</span>
                <h1 className="heading-xl">ALL<br /><span className="text-[var(--grey-400)]">TOKENS</span></h1>
              </div>
              <Link href="/launch" className="btn btn-primary hidden md:flex">
                Launch Token →
              </Link>
            </div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilter(opt.value)}
                  className={`px-6 py-3 text-small transition-all ${filter === opt.value ? 'bg-[var(--lime)] text-black' : 'bg-[var(--grey-100)] text-[var(--grey-500)] hover:bg-[var(--grey-200)]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tokens..."
                className="w-full px-4 py-3 bg-[var(--grey-100)] border border-[var(--grey-200)] text-white placeholder:text-[var(--grey-500)] focus:outline-none focus:border-[var(--lime)]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--grey-500)] hover:text-white text-small">
                  CLEAR
                </button>
              )}
            </div>
          </motion.div>

          {/* Token List */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="loader" />
            </div>
          ) : filteredTokens.length > 0 ? (
            <div className="space-y-2">
              {filteredTokens.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/token/${token.id}`}
                    className="group flex items-center justify-between p-6 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-small text-[var(--grey-500)] w-8">{String(i + 1).padStart(2, '0')}</span>
                      <TokenAvatar token={token} />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-xl group-hover:text-[var(--lime)] transition-colors">{token.name}</span>
                          <span className={`badge ${token.status === 'live' ? 'badge-live' : 'badge-soon'}`}>{token.status === 'live' ? 'LIVE' : 'BONDING'}</span>
                        </div>
                        <span className="text-body text-sm">${token.symbol}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="hidden md:block text-right">
                        <span className="text-small text-[var(--grey-500)] block">FEES</span>
                        <span className="font-mono">{Number(token.total_fees_claimed || 0).toFixed(2)} SOL</span>
                      </div>
                      <div className="hidden md:block text-right">
                        <span className="text-small text-[var(--grey-500)] block">BUYBACK</span>
                        <span className="font-mono text-[var(--lime)]">{Number(token.total_buyback || 0).toFixed(2)} SOL</span>
                      </div>
                      <svg className="w-6 h-6 text-[var(--grey-500)] group-hover:text-[var(--lime)] group-hover:translate-x-2 transition-all" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : search ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32">
              <h2 className="heading-lg mb-4">NO RESULTS</h2>
              <p className="text-body mb-6">Try a different search term</p>
              <button onClick={() => setSearch("")} className="btn btn-outline">Clear Search</button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-32">
              <h2 className="heading-xl mb-4">NO TOKENS<br /><span className="text-[var(--grey-400)]">YET</span></h2>
              <p className="text-body mb-10">Be the first to launch</p>
              <Link href="/launch" className="btn btn-primary">Launch Token →</Link>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--grey-200)]">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[var(--lime)]" />
            <span className="font-display text-xl">LAUNCHLABS</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-[var(--grey-500)]">
            <Link href="/docs" className="hover:text-[var(--lime)]">Docs</Link>
            <span>© 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TokenAvatar({ token }: { token: Token }) {
  const [error, setError] = useState(false);
  if (error || !token.image_url) {
    return (
      <div className="w-12 h-12 bg-[var(--lime)] flex items-center justify-center font-display text-black text-lg">
        {token.symbol.slice(0, 2)}
      </div>
    );
  }
  return <img src={token.image_url} alt={token.symbol} className="w-12 h-12 object-cover bg-[var(--grey-200)]" onError={() => setError(true)} />;
}
