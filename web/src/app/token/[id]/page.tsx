"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getToken, getTokenHistory, type Token, type FeedHistory } from "@/lib/api";

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
          getTokenHistory(tokenId),
        ]);
        setToken(tokenData);
        setHistory(historyData);
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
      <div className="min-h-screen relative">
        <div className="grid-bg" />
        <Header />
        <main className="relative z-10 pt-24 pb-20">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-center py-20">
            <div className="loader" />
          </div>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen relative">
        <div className="grid-bg" />
        <Header />
        <main className="relative z-10 pt-24 pb-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="card text-center py-16">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold mb-2">Token not found</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                This token doesn't exist or has been removed.
              </p>
              <Link href="/tokens" className="btn btn-primary">
                Browse Tokens
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="grid-bg" />
      <div className="glow-orb glow-orb-1" />

      <Header />

      <main className="relative z-10 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Back link */}
          <Link 
            href="/tokens" 
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to tokens
          </Link>

          {/* Token Header */}
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <TokenImage token={token} size="large" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{token.name}</h1>
                  <StatusBadge status={token.status} />
                </div>
                <div className="text-[var(--text-muted)] mb-4">${token.symbol}</div>
                {token.mint && (
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg text-[var(--text-secondary)]">
                      {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                    </code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(token.mint)}
                      className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <a
                      href={`https://solscan.io/token/${token.mint}`}
                      target="_blank"
                      rel="noopener"
                      className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                      title="View on Solscan"
                    >
                      <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-value">{Number(token.total_fees_claimed || 0).toFixed(2)}</div>
              <div className="stat-label">Fees Claimed (SOL)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Number(token.total_buyback || 0).toFixed(2)}</div>
              <div className="stat-label">Bought Back (SOL)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Number(token.total_burned || 0).toFixed(0)}</div>
              <div className="stat-label">Tokens Burned</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Number(token.total_lp_added || 0).toFixed(2)}</div>
              <div className="stat-label">LP Added (SOL)</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] inline-flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "overview"
                  ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "history"
                  ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="card animate-fade-in">
              <h3 className="text-lg font-semibold mb-4">Active Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FeatureCard icon="🔥" name="Buyback & Burn" active={true} />
                <FeatureCard icon="💧" name="Auto-Liquidity" active={true} />
                <FeatureCard icon="🎰" name="Jackpot" active={false} />
                <FeatureCard icon="📈" name="Revenue Share" active={false} />
              </div>

              {token.description && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-[var(--text-secondary)]">{token.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="card animate-fade-in">
              <h3 className="text-lg font-semibold mb-4">Activity History</h3>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center">
                        {item.action === "buyback" && "🔥"}
                        {item.action === "claim" && "💰"}
                        {item.action === "lp" && "💧"}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium capitalize">{item.action}</div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{Number(item.amount_sol || 0).toFixed(4)} SOL</div>
                        {item.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${item.tx_signature}`}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            View tx
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-muted)]">
                  No activity yet
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TokenImage({ token, size = "medium" }: { token: Token; size?: "medium" | "large" }) {
  const [error, setError] = useState(false);
  const sizeClasses = size === "large" ? "w-20 h-20 rounded-2xl text-2xl" : "w-12 h-12 rounded-xl text-lg";

  if (error || !token.image_url) {
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-[var(--accent-subtle)] to-[var(--accent-secondary-glow)] flex items-center justify-center font-bold text-[var(--accent)]`}>
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={token.image_url}
      alt={token.symbol}
      className={`${sizeClasses} object-cover bg-[var(--bg-tertiary)]`}
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

function FeatureCard({ icon, name, active }: { icon: string; name: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${
      active 
        ? "bg-[var(--accent-subtle)] border-[var(--accent)]/30" 
        : "bg-[var(--bg-tertiary)] border-[var(--border)]"
    }`}>
      <span className="text-xl">{icon}</span>
      <span className={active ? "font-medium" : "text-[var(--text-muted)]"}>{name}</span>
      {active ? (
        <span className="ml-auto text-[var(--accent)] text-sm">Active</span>
      ) : (
        <span className="ml-auto text-[var(--text-muted)] text-sm">Disabled</span>
      )}
    </div>
  );
}
