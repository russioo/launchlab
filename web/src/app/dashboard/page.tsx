"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { getUserTokens } from "@/lib/auth";
import { motion } from "framer-motion";

function formatAmount(amount: number): string {
  if (amount === 0) return "0";
  const val = amount > 1_000_000_000_000 ? amount / 1_000_000 : amount;
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Token {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  platform: string;
  status: string;
  image_url?: string;
  total_fees_claimed?: number;
  total_buyback?: number;
  total_burned?: number;
  feature_buyback_enabled: boolean;
  feature_autoliq_enabled: boolean;
  feature_revshare_enabled: boolean;
  feature_jackpot_enabled: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTokens = async () => {
    if (!user) return;
    try {
      const data = await getUserTokens(user.id);
      setTokens(data.tokens || []);
    } catch (e) {
      console.error("Failed to load tokens:", e);
    } finally {
      setTokensLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { label: "TOKENS", value: tokens.length.toString() },
    { label: "FEES CLAIMED", value: `${tokens.reduce((s, t) => s + (t.total_fees_claimed || 0), 0).toFixed(4)} SOL` },
    { label: "BUYBACK", value: `${tokens.reduce((s, t) => s + (t.total_buyback || 0), 0).toFixed(4)} SOL` },
    { label: "BURNED", value: formatAmount(tokens.reduce((s, t) => s + (t.total_burned || 0), 0)) },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container max-w-5xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <span className="text-small text-[var(--lime)] mb-4 block">Dashboard</span>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="heading-xl">WELCOME<br /><span className="text-[var(--grey-400)]">{user.username.toUpperCase()}</span></h1>
                <p className="text-body mt-2">Manage your tokens and track performance.</p>
              </div>
              <Link href="/launch" className="btn btn-primary hidden md:flex">+ New Token</Link>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="p-6 bg-[var(--grey-100)] border border-[var(--grey-200)]"
              >
                <span className="text-small text-[var(--grey-500)] block mb-2">{stat.label}</span>
                <span className="font-display text-2xl text-[var(--lime)]">{stat.value}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Tokens List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--grey-100)] border border-[var(--grey-200)]"
          >
            <div className="p-6 border-b border-[var(--grey-200)] flex items-center justify-between">
              <h2 className="font-display text-xl">YOUR TOKENS</h2>
              <Link href="/launch" className="btn btn-ghost text-[var(--lime)] md:hidden">+ New</Link>
            </div>

            {tokensLoading ? (
              <div className="flex justify-center py-16">
                <div className="loader" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-body mb-6">No tokens yet</p>
                <Link href="/launch" className="btn btn-outline">Launch your first token →</Link>
              </div>
            ) : (
              <div>
                {tokens.map((token, i) => (
                  <Link
                    key={token.id}
                    href={`/token/${token.id}`}
                    className="group flex items-center justify-between p-6 border-b border-[var(--grey-200)] last:border-0 hover:bg-[var(--grey-200)] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-small text-[var(--grey-500)] w-6">{String(i + 1).padStart(2, '0')}</span>
                      <TokenImage token={token} />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium group-hover:text-[var(--lime)] transition-colors">{token.name}</span>
                          <span className="text-body text-sm">${token.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-small text-[var(--grey-500)]">{token.platform.toUpperCase()}</span>
                          <span className={`badge ${token.status === 'live' ? 'badge-live' : 'badge-soon'}`}>{token.status.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <span className="text-small text-[var(--grey-500)] block">FEES</span>
                        <span className="font-mono text-sm">{(token.total_fees_claimed || 0).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex gap-1">
                        {token.feature_buyback_enabled && <span className="w-2 h-2 bg-[var(--lime)]" title="Buyback" />}
                        {token.feature_autoliq_enabled && <span className="w-2 h-2 bg-blue-500" title="Auto-Liq" />}
                        {token.feature_revshare_enabled && <span className="w-2 h-2 bg-green-500" title="RevShare" />}
                        {token.feature_jackpot_enabled && <span className="w-2 h-2 bg-purple-500" title="Jackpot" />}
                      </div>
                      <span className="text-[var(--grey-500)] group-hover:text-[var(--lime)] transition-colors">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
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

function TokenImage({ token }: { token: Token }) {
  const [error, setError] = useState(false);
  if (error || !token.image_url) {
    return (
      <div className="w-10 h-10 bg-[var(--lime)] flex items-center justify-center font-display text-black">
        {token.symbol.charAt(0)}
      </div>
    );
  }
  return <img src={token.image_url} alt={token.symbol} className="w-10 h-10 object-cover bg-[var(--grey-200)]" onError={() => setError(true)} />;
}
