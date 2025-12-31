"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getToken, getFeedHistory, type Token, type FeedHistory } from "@/lib/api";
import { motion } from "framer-motion";

export default function TokenDetailPage() {
  const params = useParams();
  const tokenId = params.id as string;

  const [token, setToken] = useState<Token | null>(null);
  const [history, setHistory] = useState<FeedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tokenData, historyData] = await Promise.all([
          getToken(tokenId),
          getFeedHistory(tokenId),
        ]);
        setToken(tokenData);
        const filteredHistory = historyData.filter(
          (item) => !(item.type === "claim_fees" && Number(item.sol_amount) === 0)
        );
        setHistory(filteredHistory);
      } catch (error) {
        console.error("Failed to fetch token:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [tokenId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="pt-32 pb-20">
          <div className="container max-w-5xl flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[var(--grey-400)] border-t-[var(--lime)] animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="pt-32 pb-20">
          <div className="container max-w-5xl">
            <div className="p-12 bg-[var(--grey-100)] border border-[var(--grey-200)] text-center">
              <h2 className="font-display text-4xl mb-4">TOKEN NOT FOUND</h2>
              <p className="text-[var(--grey-500)] mb-8">This token does not exist or has been removed.</p>
              <Link href="/tokens" className="inline-block px-8 py-4 bg-[var(--lime)] text-black font-medium hover:bg-white transition-colors">
                BROWSE TOKENS
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const features = [
    { name: "Buyback & Burn", active: token.feature_buyback_enabled ?? true, percent: token.feature_buyback_percent ?? 0 },
    { name: "Auto-Liquidity", active: token.feature_autoliq_enabled ?? false, percent: token.feature_autoliq_percent ?? 0 },
    { name: "Revenue Share", active: token.feature_revshare_enabled ?? false, percent: token.feature_revshare_percent ?? 0 },
    { name: "Jackpot", active: token.feature_jackpot_enabled ?? false, percent: token.feature_jackpot_percent ?? 0 },
  ];

  const stats = [
    { label: "FEES CLAIMED", value: `${Number(token.total_fees_claimed || 0).toFixed(4)}`, suffix: "SOL" },
    { label: "BOUGHT BACK", value: `${Number(token.total_buyback || 0).toFixed(4)}`, suffix: "SOL" },
    { label: "TOKENS BURNED", value: formatNumber(Number(token.total_burned || 0)), suffix: "" },
    { label: "LP ADDED", value: `${Number(token.total_lp_added || 0).toFixed(4)}`, suffix: "SOL" },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container max-w-5xl">
          {/* Back link */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link href="/tokens" className="inline-flex items-center gap-2 text-xs tracking-wider text-[var(--grey-500)] hover:text-[var(--lime)] mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              BACK TO TOKENS
            </Link>
          </motion.div>

          {/* Token Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-[var(--grey-100)] border border-[var(--grey-200)] mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <TokenImage token={token} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <h1 className="font-display text-4xl md:text-5xl tracking-tight">{token.name}</h1>
                  <StatusBadge status={token.status} />
                </div>
                <div className="text-[var(--grey-500)] font-mono text-lg mb-4">${token.symbol}</div>
                {token.mint && (
                  <div className="flex items-center gap-3">
                    <code className="text-xs tracking-wider font-mono bg-[var(--grey-200)] px-3 py-2 text-[var(--grey-400)]">
                      {token.mint.slice(0, 12)}...{token.mint.slice(-12)}
                    </code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(token.mint)}
                      className="p-2 bg-[var(--grey-200)] hover:bg-[var(--lime)] hover:text-black transition-all"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <a
                      href={`https://solscan.io/token/${token.mint}`}
                      target="_blank"
                      rel="noopener"
                      className="p-2 bg-[var(--grey-200)] hover:bg-[var(--lime)] hover:text-black transition-all"
                      title="View on Solscan"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--grey-200)] mb-6"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="p-6 bg-[var(--grey-100)]">
                <div className="text-xs tracking-wider text-[var(--grey-500)] mb-2">{stat.label}</div>
                <div className="font-display text-2xl md:text-3xl text-[var(--lime)]">
                  {stat.value}
                  {stat.suffix && <span className="text-lg text-[var(--grey-500)] ml-1">{stat.suffix}</span>}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-px bg-[var(--grey-200)] mb-6"
          >
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 md:flex-none px-8 py-4 text-xs tracking-wider transition-all ${
                activeTab === "overview" ? 'bg-[var(--lime)] text-black font-medium' : 'bg-[var(--grey-100)] text-[var(--grey-500)] hover:text-white'
              }`}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 md:flex-none px-8 py-4 text-xs tracking-wider transition-all ${
                activeTab === "history" ? 'bg-[var(--lime)] text-black font-medium' : 'bg-[var(--grey-100)] text-[var(--grey-500)] hover:text-white'
              }`}
            >
              HISTORY [{history.length}]
            </button>
          </motion.div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Features */}
                <div className="p-8 bg-[var(--grey-100)] border border-[var(--grey-200)]">
                  <h3 className="text-xs tracking-wider text-[var(--lime)] mb-6">ACTIVE FEATURES</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {features.map((feature) => (
                      <div 
                        key={feature.name}
                        className={`p-5 border transition-all ${
                          feature.active 
                            ? 'border-[var(--lime)] bg-[rgba(200,255,0,0.05)]' 
                            : 'border-[var(--grey-200)] opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${feature.active ? 'text-white' : 'text-[var(--grey-500)]'}`}>
                            {feature.name}
                          </span>
                          <span className={`font-display text-xl ${feature.active ? 'text-[var(--lime)]' : 'text-[var(--grey-600)]'}`}>
                            {feature.active ? `${feature.percent}%` : 'OFF'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {token.description && (
                  <div className="p-8 bg-[var(--grey-100)] border border-[var(--grey-200)]">
                    <h3 className="text-xs tracking-wider text-[var(--lime)] mb-4">DESCRIPTION</h3>
                    <p className="text-[var(--grey-400)] leading-relaxed">{token.description}</p>
                  </div>
                )}

                {/* Platform Info */}
                <div className="p-8 bg-[var(--grey-100)] border border-[var(--grey-200)]">
                  <h3 className="text-xs tracking-wider text-[var(--lime)] mb-4">PLATFORM</h3>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl">{token.platform?.toUpperCase() || 'PUMP.FUN'}</span>
                    <span className="text-xs tracking-wider px-3 py-1 bg-[var(--lime)] text-black">ACTIVE</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="bg-[var(--grey-100)] border border-[var(--grey-200)]">
                <div className="p-6 border-b border-[var(--grey-200)]">
                  <h3 className="text-xs tracking-wider text-[var(--lime)]">ACTIVITY HISTORY</h3>
                </div>
                {history.length > 0 ? (
                  <div>
                    {history.map((item, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-4 p-6 border-b border-[var(--grey-200)] last:border-0 hover:bg-[var(--grey-200)] transition-colors"
                      >
                        <div className="w-10 h-10 bg-[var(--grey-200)] flex items-center justify-center">
                          <ActivityIcon type={item.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{formatActivityType(item.type)}</div>
                          <div className="text-xs tracking-wider text-[var(--grey-500)]">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[var(--lime)]">
                            {item.type === "burn_tokens" 
                              ? `${formatNumber(Number(item.token_amount || 0))} tokens`
                              : `${Number(item.sol_amount || 0).toFixed(4)} SOL`
                            }
                          </div>
                          {item.signature && (
                            <a
                              href={`https://solscan.io/tx/${item.signature}`}
                              target="_blank"
                              rel="noopener"
                              className="text-xs tracking-wider text-[var(--grey-500)] hover:text-[var(--lime)] transition-colors"
                            >
                              VIEW TX
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-[var(--grey-400)] mb-2">No activity yet</p>
                    <p className="text-xs tracking-wider text-[var(--grey-600)]">Transactions will appear here</p>
                  </div>
                )}
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
            <span className="font-display text-xl tracking-tight">LAUNCHLABS</span>
          </div>
          <div className="flex items-center gap-8 text-xs tracking-wider text-[var(--grey-500)]">
            <Link href="/docs" className="hover:text-[var(--lime)] transition-colors">DOCS</Link>
            <span>© 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num === 0) return "0";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    claim_fees: "Fees Claimed",
    buyback: "Buyback",
    burn_tokens: "Tokens Burned",
    add_liquidity: "Liquidity Added",
    jackpot: "Jackpot Payout",
    revshare: "Revenue Share",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function ActivityIcon({ type }: { type: string }) {
  const iconClass = "w-4 h-4 text-[var(--grey-400)]";
  
  switch (type) {
    case "claim_fees":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "buyback":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      );
    case "burn_tokens":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
      );
    case "add_liquidity":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

function TokenImage({ token }: { token: Token & { image_url?: string } }) {
  const [error, setError] = useState(false);

  if (error || !token.image_url) {
    return (
      <div className="w-20 h-20 bg-[var(--lime)] flex items-center justify-center font-display text-3xl text-black">
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={token.image_url}
      alt={token.symbol}
      className="w-20 h-20 object-cover bg-[var(--grey-200)]"
      onError={() => setError(true)}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return <span className="text-xs tracking-wider px-3 py-1 bg-[var(--lime)] text-black">GRADUATED</span>;
  }
  if (status === "bonding") {
    return <span className="text-xs tracking-wider px-3 py-1 bg-[var(--grey-300)] text-black">BONDING</span>;
  }
  return null;
}
