"use client";

import { Header } from "@/components/Header";
import { ImportTokenForm } from "@/components/ImportTokenForm";

export default function AddToken() {
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
        <section className="max-w-6xl mx-auto px-5 py-8 lg:py-12">
          <h1 className="text-4xl lg:text-5xl font-display tracking-tight mb-3">
            <span className="hero-gradient">Add</span> existing token
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Import a token you already created on Pump.fun
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-5 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
            {/* Form */}
            <div className="glass rounded-[32px] p-6 lg:p-8">
              <ImportTokenForm />
            </div>

            {/* Info */}
            <div className="space-y-5">
              {/* How it works */}
              <div className="glass rounded-[24px] p-6">
                <h3 className="font-display text-lg mb-5">How it works</h3>
                <div className="space-y-4">
                  <Step num="1" text="Paste your token mint address" />
                  <Step num="2" text="Enter your wallet private key" />
                  <Step num="3" text="Automation starts immediately" />
                </div>
              </div>

              {/* What you get */}
              <div className="glass rounded-[24px] p-6">
                <h3 className="font-display text-lg mb-5">What you get</h3>
                <div className="space-y-4">
                  <Feature text="Auto fee claiming" />
                  <Feature text="Buybacks every minute" />
                  <Feature text="LP after graduation" accent />
                </div>
              </div>

              {/* Key warning */}
              <div className="rounded-[24px] p-6 bg-gradient-to-br from-[var(--peach)]/50 to-[var(--coral-soft)]/30 border border-[var(--coral)]/20">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--coral)]/20">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Private key needed</div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Your private key is used to sign fee claims and buyback transactions automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* The loop */}
              <div className="rounded-[24px] p-6 bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] text-white shadow-xl shadow-[var(--coral)]/20">
                <div className="text-sm text-white/60 font-medium mb-5">The loop</div>
                <div className="space-y-4">
                  <LoopStep num="1" text="Claim fees" />
                  <LoopStep num="2" text="Buyback token" />
                  <LoopStep num="3" text="Add to LP" />
                </div>
                <div className="text-sm text-white/50 mt-5 pt-4 border-t border-white/10">
                  Repeats every 60 seconds
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Step({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-sm font-semibold text-[var(--coral)]">
        {num}
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function Feature({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        accent 
          ? 'bg-gradient-to-br from-[var(--coral)] to-[var(--orange)] shadow-md shadow-[var(--coral)]/20' 
          : 'bg-white/80 border border-[var(--border)]'
      }`}>
        <svg className={`w-4 h-4 ${accent ? 'text-white' : 'text-[var(--coral)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function LoopStep({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">{num}</div>
      <span className="font-medium">{text}</span>
    </div>
  );
}


