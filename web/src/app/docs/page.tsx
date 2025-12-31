"use client";

import { Header } from "@/components/Header";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  {
    id: "buyback_burn",
    name: "BUYBACK & BURN",
    description: "Automatically purchases tokens from the market using collected fees and burns them permanently. Creates deflationary pressure.",
    steps: ["Fees claimed automatically", "Tokens bought from market", "Sent to burn address", "Supply decreases forever"]
  },
  {
    id: "auto_liquidity",
    name: "AUTO-LIQUIDITY",
    description: "Collected fees automatically add to liquidity pools. LP tokens are burned, making liquidity permanent.",
    steps: ["Fees split for LP", "Added to liquidity pool", "LP tokens burned", "Liquidity locked forever"]
  },
  {
    id: "jackpot",
    name: "JACKPOT REWARDS",
    description: "Random token holders win SOL rewards from trading fees. Creates gamified holding experience.",
    steps: ["Fees go to jackpot pool", "Random holder selected", "Winner receives SOL", "Repeat every cycle"]
  },
  {
    id: "revenue_share",
    name: "REVENUE SHARE",
    description: "Distribute trading fees proportionally to all holders. Passive income for your community.",
    steps: ["Fees collected", "Holder snapshot taken", "Rewards distributed", "Automatic, no claiming"]
  },
];

const platforms = [
  { name: "PUMP.FUN", status: "LIVE", desc: "Original memecoin launchpad with bonding curve" },
  { name: "BAGS.FM", status: "LIVE", desc: "Token-2022 with built-in creator fees" },
  { name: "BONK.FUN", status: "LIVE", desc: "Raydium LaunchLab powered by Bonk" },
  { name: "MOONSHOT", status: "SOON", desc: "Dexscreener's launchpad integration" },
];

const faqs = [
  { q: "How much does it cost?", a: "LaunchLabs takes 3% of claimed fees. No upfront costs — you only pay when earning." },
  { q: "Can I change features after launch?", a: "Some settings adjustable. Core tokenomics locked for security." },
  { q: "Is liquidity safe?", a: "Yes. Auto-Liquidity burns LP tokens immediately — permanent and unruggable." },
  { q: "How often do features run?", a: "Automation runs every few minutes. 24/7 fee processing." },
  { q: "Which wallets work?", a: "Phantom, Solflare, Backpack, and all major Solana wallets." },
];

export default function DocsPage() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container max-w-4xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <span className="text-small text-[var(--lime)] mb-4 block">Documentation</span>
            <h1 className="heading-xl">HOW IT<br /><span className="text-[var(--grey-400)]">WORKS</span></h1>
          </motion.div>

          {/* Quick Start */}
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-20">
            <div className="p-8 bg-[var(--grey-100)] border border-[var(--grey-200)]">
              <span className="text-small text-[var(--lime)] block mb-6">QUICK START</span>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {[
                  { step: "01", title: "CONNECT", desc: "Wallet" },
                  { step: "02", title: "SELECT", desc: "Platform" },
                  { step: "03", title: "ENABLE", desc: "Features" },
                  { step: "04", title: "ENTER", desc: "Details" },
                  { step: "05", title: "DEPLOY", desc: "Token" },
                ].map((item, i) => (
                  <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <span className="font-display text-4xl text-[var(--grey-300)]">{item.step}</span>
                    <div className="font-medium mt-1">{item.title}</div>
                    <div className="text-small text-[var(--grey-500)]">{item.desc}</div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/launch" className="btn btn-primary">Start Now →</Link>
              </div>
            </div>
          </motion.section>

          {/* Features */}
          <section className="mb-20">
            <span className="text-small text-[var(--lime)] block mb-4">01 / FEATURES</span>
            <h2 className="heading-lg mb-10">AUTOMATION</h2>
            <div className="space-y-2">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-[var(--grey-200)] hover:border-[var(--lime)] transition-colors"
                >
                  <button onClick={() => setActiveFeature(activeFeature === i ? null : i)} className="w-full p-6 flex items-center justify-between text-left group">
                    <div>
                      <span className="font-display text-xl group-hover:text-[var(--lime)] transition-colors">{feat.name}</span>
                    </div>
                    <span className={`font-display text-2xl transition-transform ${activeFeature === i ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: activeFeature === i ? "auto" : 0, opacity: activeFeature === i ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <p className="text-body mb-6">{feat.description}</p>
                      <div className="p-5 bg-[var(--grey-200)]">
                        <span className="text-small text-[var(--grey-500)] block mb-4">HOW IT WORKS</span>
                        <div className="space-y-3">
                          {feat.steps.map((step, j) => (
                            <div key={j} className="flex items-center gap-4">
                              <span className="font-display text-[var(--lime)]">{String(j + 1).padStart(2, '0')}</span>
                              <span className="text-sm">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Platforms */}
          <section className="mb-20">
            <span className="text-small text-[var(--lime)] block mb-4">02 / PLATFORMS</span>
            <h2 className="heading-lg mb-10">INTEGRATIONS</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {platforms.map((plat, i) => (
                <motion.div
                  key={plat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-xl group-hover:text-[var(--lime)] transition-colors">{plat.name}</span>
                    <span className={`badge ${plat.status === 'LIVE' ? 'badge-live' : 'badge-soon'}`}>{plat.status}</span>
                  </div>
                  <p className="text-body text-sm">{plat.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <span className="text-small text-[var(--lime)] block mb-4">03 / FAQ</span>
            <h2 className="heading-lg mb-10">QUESTIONS</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="border border-[var(--grey-200)]"
                >
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-5 flex items-center justify-between text-left group">
                    <span className="font-medium group-hover:text-[var(--lime)] transition-colors">{faq.q}</span>
                    <span className={`transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <p className="text-body text-sm">{faq.a}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="p-12 bg-[var(--lime)] text-black text-center">
              <h2 className="heading-lg mb-4">READY TO<br />LAUNCH?</h2>
              <p className="text-black/60 mb-8 max-w-md mx-auto">No subscriptions. No hidden fees. Deploy in minutes.</p>
              <Link href="/launch" className="btn bg-black text-white hover:bg-[var(--grey-100)] py-5 px-10">Launch Token →</Link>
            </div>
          </motion.section>
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
