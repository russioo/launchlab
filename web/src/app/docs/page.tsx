"use client";

import { Header } from "@/components/Header";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  {
    id: "buyback_burn",
    name: "Buyback & Burn",
    description: "Automatically purchases tokens from the market using collected fees and burns them permanently. This creates constant buying pressure and reduces total supply over time, making your token deflationary.",
    howItWorks: [
      "Creator fees are claimed automatically every cycle",
      "A percentage is used to buy tokens from the open market",
      "Purchased tokens are sent to a burn address (destroyed forever)",
      "Supply decreases, scarcity increases"
    ]
  },
  {
    id: "auto_liquidity",
    name: "Auto-Liquidity",
    description: "Collected fees are automatically added to liquidity pools, creating deeper and more stable trading. The LP tokens are burned, making the liquidity permanent and unruggable.",
    howItWorks: [
      "Fees are claimed and split between token buyback and SOL",
      "Both sides are added to the liquidity pool",
      "LP tokens received are immediately burned",
      "Liquidity grows forever, can never be removed"
    ]
  },
  {
    id: "jackpot",
    name: "Jackpot Rewards",
    description: "A portion of trading fees goes into a jackpot pool. Random token holders are selected to win SOL rewards, creating excitement and incentivizing holding.",
    howItWorks: [
      "Percentage of fees goes to jackpot pool",
      "Random holder is selected (weighted by holdings)",
      "Winner receives SOL directly to their wallet",
      "Creates gamified holding experience"
    ]
  },
  {
    id: "revenue_share",
    name: "Revenue Share",
    description: "Distribute trading fees proportionally to all token holders. The more you hold, the more you earn. Passive income for your community.",
    howItWorks: [
      "Fees are collected from trading activity",
      "Snapshot of all holders is taken",
      "Rewards distributed based on holding percentage",
      "Automatic, no claiming required"
    ]
  },
];

const platforms = [
  {
    id: "pumpfun",
    name: "Pump.fun",
    status: "Live",
    description: "The original memecoin launchpad. Bonding curve model with automatic graduation to DEX.",
  },
  {
    id: "moonshot",
    name: "Moonshot",
    status: "Coming Soon",
    description: "Dexscreener's launchpad. Integrated with the largest DEX aggregator.",
  },
  {
    id: "believe",
    name: "Believe",
    status: "Coming Soon",
    description: "Community-first token launches with built-in social features.",
  },
  {
    id: "raydium",
    name: "Raydium LaunchLab",
    status: "Coming Soon",
    description: "Launch directly on Raydium with instant liquidity.",
  },
];

const faqs = [
  {
    q: "How much does it cost?",
    a: "CROSSPAD takes a small percentage of claimed fees (3%). There are no upfront costs — you only pay when your token is generating revenue."
  },
  {
    q: "Can I change features after launching?",
    a: "Some features can be adjusted after launch, but core tokenomics are locked for security. This protects your holders from rug pulls."
  },
  {
    q: "Is my liquidity safe?",
    a: "Yes. When using Auto-Liquidity, all LP tokens are burned immediately. This means the liquidity can never be removed — it's permanent."
  },
  {
    q: "How often do features run?",
    a: "The automation cycle runs every few minutes. Fees are claimed, processed, and distributed automatically 24/7."
  },
  {
    q: "Which wallets are supported?",
    a: "We support all major Solana wallets including Phantom, Solflare, Backpack, and more."
  },
];

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

export default function DocsPage() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] relative overflow-x-hidden">
      {/* Floating accent orbs */}
      <div 
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{ 
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          top: '10%', 
          right: '-10%',
          filter: 'blur(60px)',
        }}
      />
      <div 
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
        style={{ 
          background: 'radial-gradient(circle, var(--teal) 0%, transparent 70%)',
          bottom: '20%', 
          left: '-5%',
          filter: 'blur(60px)',
        }}
      />
      
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <motion.div 
            className="mb-20"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUpVariant} className="flex items-center gap-4 mb-6">
              <motion.div 
                className="w-8 h-[2px] bg-[var(--accent)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
              <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                Documentation
              </span>
            </motion.div>
            
            <motion.h1 variants={fadeUpVariant} className="heading-lg mb-4">
              Learn how
              <br />
              <span className="text-italic">it works</span>
              <span className="text-[var(--accent)]">.</span>
            </motion.h1>
            
            <motion.p variants={fadeUpVariant} className="text-body max-w-lg">
              Everything you need to know about launching and automating your token on Crosspad.
            </motion.p>
          </motion.div>

          {/* Quick Start Banner */}
          <motion.section 
            className="mb-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="rounded-[1.5rem] bg-[var(--bg-warm)]/80 backdrop-blur-sm relative overflow-hidden shadow-[0_8px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/60">
              {/* Decorative background */}
              <div className="absolute inset-0 pointer-events-none">
                <img 
                  src="/banner.png" 
                  alt="" 
                  className="absolute left-0 top-0 w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-warm)]/90 via-[var(--bg-warm)]/60 to-transparent" />
              </div>
              
              <div className="relative z-10 p-8 md:p-10">
                <div className="mb-8">
                  <span className="text-[var(--accent)] text-sm font-medium tracking-wide">Get Started</span>
                  <h2 className="font-serif text-2xl mt-1">Quick Start</h2>
                </div>
                
                <div className="grid md:grid-cols-5 gap-8">
                  {[
                    { title: "Connect Wallet", desc: "Phantom, Solflare, etc." },
                    { title: "Choose Platform", desc: "Select your launchpad" },
                    { title: "Configure", desc: "Enable features" },
                    { title: "Enter Details", desc: "Name, symbol, image" },
                    { title: "Deploy", desc: "Sign and launch" },
                  ].map((item, i) => (
                    <motion.div 
                      key={item.title} 
                      className="relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <span className="font-serif text-4xl text-[var(--accent)]/20">{String(i + 1).padStart(2, '0')}</span>
                      <div className="font-medium text-sm mt-1">{item.title}</div>
                      <div className="text-xs text-[var(--ink-muted)] mt-0.5">{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-10">
                  <Link 
                    href="/launch" 
                    className="group inline-block"
                  >
                    <span className="text-lg font-medium text-[var(--accent)]">Start launching</span>
                    <motion.span 
                      className="block h-[2px] bg-[var(--accent)] mt-1"
                      whileHover={{ x: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    />
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Features Section */}
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[2px] bg-[var(--accent)]" />
              <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                Features
              </span>
            </div>
            <h2 className="heading-lg mb-10">
              Built-in
              <br />
              <span className="text-italic">automation</span>
            </h2>
            
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div 
                  key={feature.id} 
                  className="rounded-xl bg-white/60 border border-[var(--ink)]/5 overflow-hidden transition-all hover:shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <button
                    onClick={() => setActiveFeature(activeFeature === i ? null : i)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 group"
                  >
                    <div>
                      <span className="text-xs text-[var(--ink-faded)] uppercase tracking-wider">{feature.name}</span>
                      <h3 className="font-serif text-xl mt-1 group-hover:text-[var(--accent)] transition-colors">{feature.name}</h3>
                    </div>
                    <motion.span
                      className="text-[var(--ink-faded)] text-xl"
                      animate={{ rotate: activeFeature === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      +
                    </motion.span>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: activeFeature === i ? "auto" : 0,
                      opacity: activeFeature === i ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <p className="text-[var(--ink-muted)] mb-6 leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="p-5 bg-[var(--bg-soft)] rounded-xl">
                        <div className="text-xs font-medium text-[var(--ink-faded)] uppercase tracking-wider mb-4">How it works</div>
                        <ol className="space-y-3">
                          {feature.howItWorks.map((step, j) => (
                            <li key={j} className="flex items-start gap-4 text-sm text-[var(--ink-soft)]">
                              <span className="font-serif text-[var(--accent)]/40 text-lg shrink-0 w-6">
                                {String(j + 1).padStart(2, '0')}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Platforms Section */}
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[2px] bg-[var(--accent)]" />
              <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                Integrations
              </span>
            </div>
            <h2 className="heading-lg mb-10">
              Supported
              <br />
              <span className="text-italic">platforms</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {platforms.map((platform, i) => (
                <motion.div 
                  key={platform.id} 
                  className="p-6 rounded-xl bg-white/60 border border-[var(--ink)]/5 hover:shadow-lg transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-serif text-xl group-hover:text-[var(--accent)] transition-colors">{platform.name}</span>
                    {platform.status === "Live" ? (
                      <span className="text-xs text-[var(--accent)] italic">Ready</span>
                    ) : (
                      <span className="text-xs text-[var(--ink-faded)] italic">Soon</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {platform.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[2px] bg-[var(--accent)]" />
              <span className="text-[var(--accent)] text-sm font-medium tracking-wide">
                Support
              </span>
            </div>
            <h2 className="heading-lg mb-10">
              Frequently
              <br />
              <span className="text-italic">asked</span>
            </h2>
            
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div 
                  key={i} 
                  className="rounded-xl bg-white/60 border border-[var(--ink)]/5 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 group"
                  >
                    <h3 className="font-medium group-hover:text-[var(--accent)] transition-colors">{faq.q}</h3>
                    <motion.span
                      className="text-[var(--ink-faded)] text-xl shrink-0"
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      +
                    </motion.span>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: openFaq === i ? "auto" : 0,
                      opacity: openFaq === i ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <p className="text-[var(--ink-muted)] text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-[1.5rem] bg-[var(--bg-warm)]/80 backdrop-blur-sm relative overflow-hidden shadow-[0_8px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/60 text-center p-12">
              {/* Background glow */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full opacity-30 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
                  filter: 'blur(60px)',
                }}
              />
              
              <div className="relative z-10">
                <h2 className="heading-lg mb-4">
                  Ready to
                  <br />
                  <span className="text-italic">launch</span>
                  <span className="text-[var(--accent)]">?</span>
                </h2>
                <p className="text-body mb-8 max-w-md mx-auto">
                  Create your token in minutes with all the features you need.
                </p>
                <Link 
                  href="/launch" 
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--ink)] text-[var(--bg-cream)] font-medium hover:bg-[var(--accent)] transition-all hover:-translate-y-0.5"
                >
                  Launch Token
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-[var(--ink)]/5">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="font-serif text-xl text-[var(--ink)]">Crosspad</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-[var(--ink-muted)]">
            <Link href="/docs" className="hover:text-[var(--accent)] transition-colors">
              Docs
            </Link>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener"
              className="hover:text-[var(--accent)] transition-colors"
            >
              Twitter
            </a>
            <span>© 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
