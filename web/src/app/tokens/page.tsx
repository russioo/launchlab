"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getTokens, type Token } from "@/lib/api";
import { motion } from "framer-motion";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(0);

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
    return (
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.mint?.toLowerCase().includes(q)
    );
  });

  const filterOptions = [
    { value: null, label: "All" },
    { value: "live", label: "Graduated" },
    { value: "bonding", label: "Bonding" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] relative overflow-x-hidden">
      {/* Floating accent orbs */}
      <div 
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none opacity-15"
        style={{ 
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          top: '20%', 
          right: '-10%',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
        style={{ 
          background: 'radial-gradient(circle, var(--teal) 0%, transparent 70%)',
          bottom: '10%', 
          left: '-10%',
          filter: 'blur(60px)',
        }}
      />
      
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container">
          {/* Header */}
          <motion.div 
            className="mb-16"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUpVariant} className="flex items-center gap-4 mb-6">
              <div className="w-8 h-[2px] bg-[var(--accent)]" />
              <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                Explore
              </span>
            </motion.div>
            
            <motion.div variants={fadeUpVariant} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <h1 className="heading-lg mb-4">
                  All
                  <br />
                  <span className="text-italic">tokens</span>
                  <span className="text-[var(--accent)]">.</span>
                </h1>
                <p className="text-body max-w-lg">
                  Tokens launched on Crosspad with built-in automation.
                </p>
              </div>
              
              <Link 
                href="/launch" 
                className="group inline-block shrink-0"
              >
                <span className="text-lg font-medium text-[var(--accent)]">Launch token</span>
                <span className="block h-[2px] bg-[var(--accent)] mt-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Filter Tabs */}
            <div className="flex items-center">
              {filterOptions.map((option, i) => (
                <button
                  key={option.label}
                  onClick={() => {
                    setFilter(option.value);
                    setActiveFilter(i);
                  }}
                  className="group relative px-6 py-3"
                >
                  <span className={`font-serif text-xl transition-colors duration-300 ${
                    activeFilter === i 
                      ? 'text-[var(--ink)]' 
                      : 'text-[var(--ink-faded)] hover:text-[var(--ink-muted)]'
                  }`}>
                    {option.label}
                  </span>
                  <div className={`absolute bottom-0 left-6 right-6 h-[2px] transition-all duration-300 ${
                    activeFilter === i ? 'bg-[var(--accent)]' : 'bg-transparent'
                  }`} />
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-0 py-3 bg-transparent border-b border-[var(--ink)]/10 text-[var(--ink)] placeholder:text-[var(--ink-faded)] focus:outline-none focus:border-[var(--accent)] transition-all font-serif text-lg"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--ink-faded)] hover:text-[var(--ink)] text-sm italic"
                >
                  clear
                </button>
              )}
            </div>
          </motion.div>

          {/* Token List */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-6 h-6 border-2 border-[var(--ink-faded)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          ) : filteredTokens.length > 0 ? (
            <motion.div 
              className="space-y-0"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {filteredTokens.map((token) => (
                <motion.div
                  key={token.id}
                  variants={fadeUpVariant}
                >
                  <Link
                    href={`/token/${token.id}`}
                    className="group flex items-center gap-6 py-6 border-b border-[var(--ink)]/5 hover:pl-4 transition-all duration-300"
                  >
                    <TokenAvatar token={token} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-serif text-xl group-hover:text-[var(--accent)] transition-colors truncate">
                          {token.name}
                        </span>
                        <StatusBadge status={token.status} />
                      </div>
                      <span className="text-sm text-[var(--ink-muted)]">${token.symbol}</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-10">
                      <div className="text-right">
                        <div className="font-serif text-lg">{Number(token.total_fees_claimed || 0).toFixed(2)}</div>
                        <div className="text-xs text-[var(--ink-faded)]">fees</div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-lg text-[var(--accent)]">{Number(token.total_buyback || 0).toFixed(2)}</div>
                        <div className="text-xs text-[var(--ink-faded)]">buyback</div>
                      </div>
                    </div>

                    <span className="text-[var(--ink-faded)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all text-xl">
                      →
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : search ? (
            <motion.div 
              className="text-center py-32"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="font-serif text-3xl text-[var(--ink)] mb-2">
                No results<span className="text-[var(--accent)]">.</span>
              </p>
              <p className="text-[var(--ink-muted)] mb-6">Try a different search term</p>
              <button 
                onClick={() => setSearch("")}
                className="text-[var(--accent)] text-sm italic hover:underline"
              >
                clear search
              </button>
            </motion.div>
          ) : (
            <motion.div 
              className="text-center py-32"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="font-serif text-4xl mb-4">
                No tokens
                <span className="text-italic"> yet</span>
                <span className="text-[var(--accent)]">.</span>
              </p>
              <p className="text-[var(--ink-muted)] mb-10 max-w-sm mx-auto">
                Be the first to launch a token with built-in automation.
              </p>
              <Link 
                href="/launch" 
                className="group inline-block"
              >
                <span className="font-serif text-2xl text-[var(--accent)]">Launch token</span>
                <span className="block h-[2px] bg-[var(--accent)] mt-1" />
              </Link>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-[var(--ink)]/5">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="font-serif text-xl text-[var(--ink)]">Crosspad</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-[var(--ink-muted)]">
            <Link href="/docs" className="hover:text-[var(--accent)] transition-colors">
              Docs
            </Link>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener"
              className="hover:text-[var(--accent)] transition-colors"
            >
              Twitter
            </a>
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
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--teal)] flex items-center justify-center text-white font-serif">
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={token.image_url}
      alt={token.symbol}
      className="w-12 h-12 rounded-xl object-cover bg-[var(--bg-soft)]"
      onError={() => setError(true)}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return <span className="text-xs text-[var(--accent)] italic">Graduated</span>;
  }
  if (status === "bonding") {
    return <span className="text-xs text-[var(--ink-faded)] italic">Bonding</span>;
  }
  return null;
}
