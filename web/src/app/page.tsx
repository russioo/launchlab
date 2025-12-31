"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main>
        {/* Hero - Full screen with massive typography */}
        <section className="min-h-screen flex flex-col justify-center relative overflow-hidden pt-20">
          {/* Background number */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[40vw] font-display text-[var(--grey-100)] leading-none pointer-events-none select-none opacity-50">
            01
          </div>

          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ duration: 0.8 }}
            >
              {/* Label */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={mounted ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center gap-4 mb-8"
              >
                <div className="w-12 h-[2px] bg-[var(--lime)]" />
                <span className="text-small text-[var(--grey-500)]">Token Launchpad</span>
              </motion.div>

              {/* Main title */}
              <motion.h1
                initial={{ opacity: 0, y: 60 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="heading-hero mb-8"
              >
                <span className="text-white">LAUNCH</span>
                <br />
                <span className="text-[var(--lime)]">TOKENS</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-body-lg max-w-md mb-12"
              >
                One platform for all launchpads. Pump.fun, Bags, Bonk & more.
                Buyback, burn, liquidity — all on autopilot.
              </motion.p>

              {/* CTAs + Platform badges */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="space-y-8"
              >
                <div className="flex flex-wrap gap-4">
                  <Link href="/launch" className="btn btn-primary">
                    Start Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link href="/tokens" className="btn btn-outline">
                    Explore
                  </Link>
                </div>
                
                {/* Supported platforms indicator */}
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-small text-[var(--grey-500)]">SUPPORTS</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {["PUMP.FUN", "BAGS", "BONK"].map((platform) => (
                      <span key={platform} className="px-3 py-1.5 bg-[var(--grey-100)] border border-[var(--grey-200)] text-small text-[var(--grey-400)]">
                        {platform}
                      </span>
                    ))}
                    <span className="text-small text-[var(--lime)]">+MORE SOON</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            <span className="text-small text-[var(--grey-500)]">Scroll</span>
            <div className="w-[1px] h-16 bg-gradient-to-b from-[var(--grey-500)] to-transparent" />
          </motion.div>
        </section>

        {/* Marquee */}
        <section className="py-8 border-y border-[var(--grey-200)] overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-16 mx-8">
                {["PUMP.FUN", "BAGS", "BONK", "MULTI-CHAIN", "ZERO FEES", "24/7", "BUYBACK", "BURN"].map((text, j) => (
                  <span key={j} className="font-display text-4xl md:text-5xl text-[var(--grey-300)] flex items-center gap-16">
                    {text}
                    <span className="w-2 h-2 bg-[var(--lime)]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Features - Bento grid */}
        <section className="py-32">
          <div className="container">
            <div className="flex items-end justify-between mb-16">
              <div>
                <span className="text-small text-[var(--lime)] block mb-4">02 / Features</span>
                <h2 className="heading-xl">What we offer</h2>
              </div>
              <Link href="/docs" className="btn btn-ghost hidden md:flex">
                Learn more →
              </Link>
            </div>

            {/* Bento Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Large card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="md:col-span-2 lg:col-span-2 p-10 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-colors group"
              >
                <div className="flex items-start justify-between mb-16">
                  <span className="text-small text-[var(--grey-500)]">01</span>
                  <div className="w-12 h-12 border border-[var(--grey-300)] flex items-center justify-center group-hover:border-[var(--lime)] group-hover:bg-[var(--lime)] transition-all">
                    <svg className="w-5 h-5 group-hover:text-black transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                  </div>
                </div>
                <h3 className="heading-lg mb-4">Buyback & Burn</h3>
                <p className="text-body max-w-md">
                  Automatic token buybacks and burns. Your token becomes scarcer with every transaction — deflation on autopilot.
                </p>
              </motion.div>

              {/* Small card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="p-10 bg-[var(--lime)] text-black group"
              >
                <div className="flex items-start justify-between mb-16">
                  <span className="text-small opacity-60">02</span>
                  <span className="font-display text-6xl">24/7</span>
                </div>
                <h3 className="heading-md mb-2">Always Running</h3>
                <p className="text-sm opacity-70">Set once, runs forever.</p>
              </motion.div>

              {/* Small card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-10 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-colors group"
              >
                <div className="flex items-start justify-between mb-16">
                  <span className="text-small text-[var(--grey-500)]">03</span>
                  <div className="w-12 h-12 border border-[var(--grey-300)] flex items-center justify-center group-hover:border-[var(--lime)] group-hover:bg-[var(--lime)] transition-all">
                    <svg className="w-5 h-5 group-hover:text-black transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <h3 className="heading-md mb-2">Auto-Liquidity</h3>
                <p className="text-body text-sm">Fees automatically add to LP depth.</p>
              </motion.div>

              {/* Wide card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="md:col-span-2 p-10 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-colors group"
              >
                <div className="flex items-start justify-between mb-16">
                  <span className="text-small text-[var(--grey-500)]">04</span>
                  <div className="w-12 h-12 border border-[var(--grey-300)] flex items-center justify-center group-hover:border-[var(--lime)] group-hover:bg-[var(--lime)] transition-all">
                    <svg className="w-5 h-5 group-hover:text-black transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="heading-lg mb-4">Holder Rewards</h3>
                <p className="text-body max-w-lg">
                  Distribute trading fees to holders or run jackpot draws. Build community with real incentives.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 border-y border-[var(--grey-200)]">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "3+", label: "Platforms" },
                { value: "0%", label: "Fees" },
                { value: "24/7", label: "Uptime" },
                { value: "∞", label: "Automation" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center py-8"
                >
                  <p className="font-display text-5xl md:text-7xl text-[var(--lime)] mb-4">{stat.value}</p>
                  <p className="text-small text-[var(--grey-500)]">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="py-32">
          <div className="container">
            <div className="mb-16">
              <span className="text-small text-[var(--lime)] block mb-4">03 / Platforms</span>
              <h2 className="heading-xl">Integrations</h2>
            </div>

            <div className="space-y-2">
              {[
                { name: "Pump.fun", status: "live", desc: "Original meme launchpad" },
                { name: "Bags", status: "soon", desc: "Next-gen launches" },
                { name: "Bonk", status: "soon", desc: "Community platform" },
              ].map((platform, i) => (
                <motion.div
                  key={platform.name}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group flex items-center justify-between p-8 bg-[var(--grey-100)] border border-[var(--grey-200)] hover:border-[var(--lime)] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-8">
                    <span className="text-small text-[var(--grey-500)] w-8">0{i + 1}</span>
                    <div>
                      <h3 className="font-display text-3xl md:text-4xl group-hover:text-[var(--lime)] transition-colors">
                        {platform.name}
                      </h3>
                      <p className="text-body text-sm hidden md:block">{platform.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`badge ${platform.status === 'live' ? 'badge-live' : 'badge-soon'}`}>
                      {platform.status}
                    </span>
                    <svg className="w-6 h-6 text-[var(--grey-500)] group-hover:text-[var(--lime)] group-hover:translate-x-2 transition-all" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-[var(--lime)]" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-black hidden lg:block" />

          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="heading-xl text-black mb-6">Ready to launch?</h2>
                <p className="text-lg text-black/60 mb-10 max-w-md">
                  No subscriptions. No hidden fees. Connect wallet and deploy in minutes.
                </p>
                <Link href="/launch" className="btn bg-black text-white hover:bg-[var(--grey-100)] py-5 px-10">
                  Launch Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block text-right"
              >
                <span className="font-display text-[12rem] text-white/10 leading-none">→</span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-[var(--grey-200)]">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[var(--lime)]" />
                <span className="font-display text-xl">LAUNCHLABS</span>
              </div>

              <div className="flex items-center gap-12">
                <Link href="/docs" className="nav-link">Docs</Link>
                <a href="https://twitter.com" target="_blank" rel="noopener" className="nav-link">Twitter</a>
                <span className="text-[var(--grey-500)] text-sm">© 2025</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
