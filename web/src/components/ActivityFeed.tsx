"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentActivity, type ActivityItem } from "@/lib/api";

export function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const data = await getRecentActivity(15);
        setActivity(data);
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    // Poll every 30 seconds for new activity
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const getActionInfo = (type: string) => {
    switch (type) {
      case "claim_fees":
        return { label: "Claimed fees", icon: "💰", color: "text-[var(--success)]" };
      case "buyback":
        return { label: "Bought back", icon: "🔥", color: "text-[var(--coral)]" };
      case "add_liquidity":
        return { label: "Added LP", icon: "💎", color: "text-[var(--success)]" };
      case "create":
        return { label: "Launched", icon: "🚀", color: "text-[var(--coral)]" };
      default:
        return { label: type, icon: "⚡", color: "text-[var(--text)]" };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const shortenSignature = (sig: string) => {
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="glass rounded-[24px] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 rounded-full bg-[var(--coral)] animate-pulse" />
          <h3 className="font-display text-lg">Live Activity</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="glass rounded-[24px] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
          <h3 className="font-display text-lg">Live Activity</h3>
        </div>
        <div className="text-center py-8 text-[var(--text-muted)]">
          <p>No activity yet</p>
          <p className="text-sm mt-1">Transactions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-[24px] p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-[var(--coral)]" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-[var(--coral)] animate-ping" />
        </div>
        <h3 className="font-display text-lg">Live Activity</h3>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 -mr-2">
        {activity.map((item, index) => {
          const action = getActionInfo(item.type);
          
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-300 opacity-0 animate-fade-in-up group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Token Image */}
              {item.token?.imageUrl ? (
                <img
                  src={item.token.imageUrl}
                  alt={item.token.symbol}
                  className="w-10 h-10 rounded-xl object-cover border border-white/60"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--peach)] to-[var(--coral-soft)] flex items-center justify-center text-lg">
                  {action.icon}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {item.token?.symbol || "Unknown"}
                  </span>
                  <span className={`text-sm ${action.color}`}>
                    {action.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {item.solAmount > 0 && (
                    <span className="font-medium">{item.solAmount.toFixed(4)} SOL</span>
                  )}
                  <span>•</span>
                  <span>{formatTime(item.createdAt)}</span>
                </div>
              </div>

              {/* Solscan Link */}
              <a
                href={`https://solscan.io/tx/${item.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/60 text-xs font-medium text-[var(--text-secondary)] hover:bg-white hover:text-[var(--coral)] transition-all opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{shortenSignature(item.signature)}</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          );
        })}
      </div>

      {/* Gradient fade at bottom */}
      <div className="h-8 bg-gradient-to-t from-white/70 to-transparent -mt-8 relative pointer-events-none" />
    </div>
  );
}



