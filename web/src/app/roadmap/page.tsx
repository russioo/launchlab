"use client";

import { Header } from "@/components/Header";
import Link from "next/link";

export default function RoadmapPage() {
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
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 py-12 lg:py-16">
          <div className="text-center opacity-0 animate-fade-in-up">
            <h1 className="text-5xl lg:text-6xl font-display mb-6">
              <span className="hero-gradient">Roadmap</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Building the future of self-sustaining liquidity
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="max-w-4xl mx-auto px-5 pb-20">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--coral)] via-[var(--coral-light)] to-[var(--peach)] hidden md:block" />

            {/* Phase 1 */}
            <RoadmapPhase 
              number="1"
              title="Foundation"
              status="completed"
              delay="0.1s"
              items={[
                "Self-sustaining liquidity engine",
                "Automatic fee claiming, buybacks, and LP burning",
                "Live activity feed with transaction links",
                "Token creation via Pump.fun",
                "Real-time dashboard with global stats",
                "Token pages with social links and transaction history",
              ]}
            />

            {/* Phase 2 */}
            <RoadmapPhase 
              number="2"
              title="Core Upgrades"
              status="in-progress"
              delay="0.2s"
              items={[
                "SURGE API for programmatic token creation",
                "Automatic burning of all buyback tokens",
                "Platform fee redirected to buyback of $SURGE",
                "Live price charts on token pages",
                "Token search and filtering",
              ]}
            />

            {/* Phase 3 */}
            <RoadmapPhase 
              number="3"
              title="Analytics"
              status="upcoming"
              delay="0.3s"
              items={[
                "Holder and volume analytics",
                "Telegram and Discord notifications",
                "Creator dashboard for multiple tokens",
              ]}
            />

            {/* Phase 4 */}
            <RoadmapPhase 
              number="4"
              title="Expansion"
              status="upcoming"
              delay="0.4s"
              items={[
                "Referral program",
                "Trending tokens leaderboard",
                "Surge Launchpad for curated launches",
                "Mobile app",
                "Cross-chain support",
              ]}
            />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-5 pb-20 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="glass rounded-[32px] p-10 text-center">
            <h2 className="text-2xl font-display mb-4">Ready to launch?</h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Start building with self-sustaining liquidity today
            </p>
            <Link href="/launch" className="btn-primary inline-flex items-center gap-3">
              Launch token
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function RoadmapPhase({ 
  number, 
  title, 
  status, 
  items,
  delay 
}: { 
  number: string;
  title: string;
  status: "completed" | "in-progress" | "upcoming";
  items: string[];
  delay: string;
}) {
  const statusText = {
    "completed": "Completed",
    "in-progress": "In Progress",
    "upcoming": "Upcoming",
  };

  const statusClass = {
    "completed": "bg-[var(--success-muted)] text-[var(--success)]",
    "in-progress": "bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white",
    "upcoming": "bg-white/60 text-[var(--text-muted)]",
  };

  return (
    <div 
      className="relative flex gap-6 mb-12 opacity-0 animate-fade-in-up"
      style={{ animationDelay: delay }}
    >
      {/* Number circle */}
      <div className={`
        relative z-10 w-14 h-14 rounded-full flex items-center justify-center font-display text-xl shrink-0
        ${status === "completed" 
          ? "bg-[var(--success)] text-white" 
          : status === "in-progress"
            ? "bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] text-white shadow-lg shadow-[var(--coral)]/30"
            : "bg-white border-2 border-[var(--border)] text-[var(--text-muted)]"
        }
      `}>
        {status === "completed" ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>

      {/* Content */}
      <div className="flex-1 glass rounded-[24px] p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="text-xl font-display">Phase {number}: {title}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass[status]}`}>
            {statusText[status]}
          </span>
        </div>
        
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                status === "completed" 
                  ? "bg-[var(--success)]" 
                  : status === "in-progress"
                    ? "bg-[var(--coral)]"
                    : "bg-[var(--text-muted)]"
              }`} />
              <span className={status === "completed" ? "text-[var(--text-secondary)]" : ""}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

