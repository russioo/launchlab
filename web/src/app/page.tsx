"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getTokens, getGlobalStats, type Token, type GlobalStats } from "@/lib/api";

export default function Dashboard() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tokensRes, statsRes] = await Promise.all([
          getTokens({ status: filter || undefined }),
          getGlobalStats(),
        ]);
        setTokens(tokensRes.tokens);
        setStats(statsRes);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const graduatedTokens = tokens.filter(t => t.status === "live" || t.status === "graduating").length;

  return (
    <div className="min-h-screen relative">
      {/* Organic flowing background */}
      <div className="organic-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <Header />
      
      <main className="relative z-10 pt-28">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-5 py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div className="opacity-0 animate-fade-in-up">
              <h1 className="hero-text font-display mb-8">
                <span className="block text-[var(--text)]">Self-sustaining</span>
                <span className="hero-gradient">liquidity</span>
              </h1>
              <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-md leading-relaxed">
                Launch on PumpFun. We handle automatic fee claiming, buybacks, and LP — forever.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/launch" className="btn-primary inline-flex items-center gap-3">
                  Launch token
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link href="/docs" className="btn-secondary">
                  How it works
                </Link>
              </div>
            </div>

            {/* Right - Stats Card */}
            <div className="opacity-0 animate-fade-in-up delay-200">
              <div className="glass rounded-[32px] p-8 lg:p-10">
                <div className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-8">
                  Protocol stats
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <StatItem 
                    value={stats?.totalTokens?.toString() || "0"} 
                    label="Tokens launched" 
                    loading={loading} 
                  />
                  <StatItem 
                    value={graduatedTokens.toString()} 
                    label="Graduated" 
                    loading={loading} 
                    accent 
                  />
                  <StatItem 
                    value={`${(stats?.totalFeesClaimed || 0).toFixed(1)}`} 
                    label="Fees claimed" 
                    suffix="SOL" 
                    loading={loading} 
                  />
                  <StatItem 
                    value={`${(stats?.totalBuyback || 0).toFixed(1)}`} 
                    label="Bought back" 
                    suffix="SOL" 
                    loading={loading} 
                    accent 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Flow Section */}
        <section className="py-16 opacity-0 animate-fade-in-up delay-300">
          <div className="max-w-6xl mx-auto px-5">
            <div className="glass rounded-[32px] p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
                <span className="text-[var(--text-muted)] font-medium">Every minute</span>
                <div className="flex items-center gap-4">
                  <FlowStep num="1" text="Claim fees" />
                  <FlowArrow />
                  <FlowStep num="2" text="Buyback" />
                  <FlowArrow />
                  <FlowStep num="3" text="Add LP" accent />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tokens + Activity Section */}
        <section className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
            {/* Tokens List */}
            <div className="opacity-0 animate-fade-in-up delay-400">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <h2 className="text-3xl font-display">All tokens</h2>
              <div className="flex items-center gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-full">
                {[null, "live", "bonding"].map((status) => (
                  <button
                    key={status || "all"}
                    onClick={() => setFilter(status)}
                    className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                      filter === status
                        ? "bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white shadow-md"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {status === "live" ? "Graduated" : status || "All"}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <div className="loader" />
              </div>
            ) : tokens.length > 0 ? (
              <div className="grid gap-4">
                {tokens.map((token, index) => (
                  <Link 
                    key={token.id} 
                    href={`/token/${token.id}`}
                    className="token-card opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <TokenImage imageUrl={token.image_url} mint={token.mint} symbol={token.symbol} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-lg truncate">{token.name}</span>
                        <StatusBadge status={token.status} />
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">${token.symbol}</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-8 text-right">
                      <div>
                        <div className="font-semibold text-lg">{Number(token.total_fees_claimed).toFixed(2)}</div>
                        <div className="text-xs text-[var(--text-muted)]">fees claimed</div>
                      </div>
                      <div>
                        <div className="font-semibold text-lg hero-gradient">{Number(token.total_buyback).toFixed(2)}</div>
                        <div className="text-xs text-[var(--text-muted)]">bought back</div>
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="glass rounded-[32px] py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-[var(--peach)] to-[var(--coral-soft)] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] animate-pulse" />
                </div>
                <h3 className="text-2xl font-display mb-3">No tokens yet</h3>
                <p className="text-[var(--text-muted)] mb-8">Be the first to launch</p>
                <Link href="/launch" className="btn-primary inline-flex items-center gap-3">
                  Launch token
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            )}
            </div>

            {/* Activity Feed - Sidebar */}
            <div className="opacity-0 animate-fade-in-up delay-500 hidden lg:block">
              <div className="sticky top-28">
                <ActivityFeed />
              </div>
            </div>
          </div>

          {/* Mobile Activity Feed */}
          <div className="lg:hidden mt-8 opacity-0 animate-fade-in-up delay-500">
            <ActivityFeed />
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-20" />
      </main>
    </div>
  );
}

function StatItem({ value, label, suffix, loading, accent }: { 
  value: string; 
  label: string;
  suffix?: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      {loading ? (
        <div className="h-10 w-20 skeleton mb-2" />
      ) : (
        <div className={`text-3xl font-display ${accent ? 'hero-gradient' : 'text-[var(--text)]'}`}>
          {value}
          {suffix && <span className="text-base font-normal text-[var(--text-muted)] ml-1">{suffix}</span>}
        </div>
      )}
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function FlowStep({ num, text, accent }: { num: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`step-dot ${accent ? 'step-dot-active' : 'step-dot-inactive'}`}>
        {num}
      </span>
      <span className="text-sm font-medium hidden sm:inline">{text}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="step-line hidden sm:block" />
  );
}

function TokenImage({ imageUrl, mint, symbol }: { imageUrl: string | null; mint: string; symbol: string }) {
  const [error, setError] = useState(false);
  
  const imageSrc = !error && imageUrl ? imageUrl : `https://pump.fun/coin/${mint}/image`;
  
  if (!imageUrl && error) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--peach)] to-[var(--coral-soft)] flex items-center justify-center font-semibold text-[var(--coral)] text-sm">
        {symbol.slice(0, 2)}
      </div>
    );
  }
  
  return (
    <img 
      src={imageSrc} 
      alt={symbol}
      className="token-image"
      onError={() => setError(true)}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return <span className="badge badge-live">Live</span>;
  }
  
  if (status === "bonding") {
    return <span className="badge badge-bonding">Bonding</span>;
  }

  return null;
}
