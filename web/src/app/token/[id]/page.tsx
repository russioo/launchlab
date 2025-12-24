"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getToken, type Token, type FeedHistory } from "@/lib/api";

export default function TokenDetail() {
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<(Token & { feed_history: FeedHistory[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await getToken(tokenId);
        setToken(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch token");
      } finally {
        setLoading(false);
      }
    };

    if (tokenId) {
      fetchToken();
      const interval = setInterval(fetchToken, 30000);
      return () => clearInterval(interval);
    }
  }, [tokenId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16 max-w-4xl mx-auto px-5 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--text)] rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16 max-w-4xl mx-auto px-5 py-16">
          <div className="text-center py-16">
            <h1 className="text-xl font-display mb-4">Token not found</h1>
            <Link href="/" className="text-[var(--accent)] hover:underline">
              Back to overview
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        <section className="max-w-4xl mx-auto px-5 py-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-8">
            <TokenImage imageUrl={token.image_url} mint={token.mint} symbol={token.symbol} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-3xl font-display">{token.name}</h1>
                <StatusBadge status={token.status} />
              </div>
              <div className="text-[var(--text-muted)] font-mono mb-3">${token.symbol}</div>
              {token.description && (
                <p className="text-[var(--text-secondary)]">{token.description}</p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <ExtLink href={`https://pump.fun/${token.mint}`}>pump.fun</ExtLink>
              <ExtLink href={`https://solscan.io/token/${token.mint}`}>Solscan</ExtLink>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard label="Fees claimed" value={`${(Number(token.total_fees_claimed) || 0).toFixed(4)}`} suffix="SOL" />
            <StatCard label="Bought back" value={`${(Number(token.total_buyback) || 0).toFixed(4)}`} suffix="SOL" accent />
            <StatCard label="LP added" value={`${(Number(token.total_lp_added) || 0).toFixed(4)}`} suffix="SOL" />
            <StatCard label="Status" value={token.status === "live" ? "Graduated" : "Bonding"} />
          </div>

          {/* Addresses */}
          <div className="space-y-3 mb-8">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] card-shadow">
              <div className="text-xs text-[var(--text-muted)] mb-1">Mint</div>
              <div className="font-mono text-sm break-all">{token.mint}</div>
            </div>
            
            <div className="p-4 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/30">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-[var(--accent)]">Automation wallet</div>
                <a 
                  href={`https://solscan.io/account/${token.creator_wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
                >
                  View
                </a>
              </div>
              <div className="font-mono text-sm break-all">{token.creator_wallet}</div>
            </div>
          </div>

          {/* Socials */}
          {(token.twitter || token.telegram || token.website) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {token.twitter && <ExtLink href={token.twitter}>Twitter</ExtLink>}
              {token.telegram && <ExtLink href={token.telegram}>Telegram</ExtLink>}
              {token.website && <ExtLink href={token.website}>Website</ExtLink>}
            </div>
          )}

          {/* Info */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] card-shadow">
            {token.status === "bonding" ? (
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--warning)] font-medium">Bonding:</span> Only buybacks active. LP added after graduation (~$55k).
              </p>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--success)] font-medium">Graduated:</span> Full automation. Fees, buybacks, and LP every minute.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] card-shadow ${accent ? 'stat-accent' : ''}`}>
      <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-lg font-display ${accent ? 'text-[var(--accent)]' : ''}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function TokenImage({ imageUrl, mint, symbol }: { imageUrl: string | null; mint: string; symbol: string }) {
  const [error, setError] = useState(false);
  const imageSrc = !error ? (imageUrl || `https://pump.fun/coin/${mint}/image`) : `https://pump.fun/coin/${mint}/image`;
  
  if (error && !imageUrl) {
    return (
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center font-display text-xl text-[var(--text-muted)]">
        {symbol.slice(0, 2)}
      </div>
    );
  }
  
  return (
    <img src={imageSrc} alt={symbol} className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)]" onError={() => setError(true)} />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium badge-live rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Live
      </span>
    );
  }
  return <span className="px-2.5 py-1 text-xs font-medium badge-bonding rounded-full">Bonding</span>;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full border border-[var(--border)] text-sm hover:border-[var(--text)] transition-colors">
      {children}
    </a>
  );
}
