"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";

// Available platforms
const platforms = [
  { 
    id: "pumpfun", 
    name: "Pump.fun", 
    description: "The original memecoin launchpad",
    status: "live"
  },
  { 
    id: "moonshot", 
    name: "Moonshot", 
    description: "Dexscreener's launchpad",
    status: "coming"
  },
  { 
    id: "believe", 
    name: "Believe", 
    description: "Community-first launches",
    status: "coming"
  },
  { 
    id: "raydium", 
    name: "Raydium", 
    description: "LaunchLab by Raydium",
    status: "coming"
  },
];

// Available features
const availableFeatures = [
  {
    id: "buyback_burn",
    name: "Buyback & Burn",
    description: "Automatically buy tokens back from the market and burn them. Creates deflationary pressure.",
    recommended: true,
  },
  {
    id: "auto_liquidity",
    name: "Auto-Liquidity",
    description: "Claim creator fees and automatically add them to liquidity pools. Growing LP forever.",
    recommended: true,
  },
  {
    id: "jackpot",
    name: "Jackpot Rewards",
    description: "Random holders win SOL rewards from a portion of trading fees.",
    recommended: false,
  },
  {
    id: "revenue_share",
    name: "Revenue Share",
    description: "Distribute a percentage of fees proportionally to all token holders.",
    recommended: false,
  },
];

type Step = "platform" | "features" | "details" | "review";

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

export default function LaunchPage() {
  const [step, setStep] = useState<Step>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["buyback_burn", "auto_liquidity"]);
  const [tokenDetails, setTokenDetails] = useState({
    name: "",
    symbol: "",
    description: "",
    image: null as File | null,
  });

  const steps: { id: Step; label: string }[] = [
    { id: "platform", label: "Platform" },
    { id: "features", label: "Features" },
    { id: "details", label: "Details" },
    { id: "review", label: "Review" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const canProceed = () => {
    switch (step) {
      case "platform":
        return selectedPlatform !== null;
      case "features":
        return selectedFeatures.length > 0;
      case "details":
        return tokenDetails.name && tokenDetails.symbol;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] relative overflow-x-hidden">
      {/* Floating accent orbs */}
      <div 
        className="fixed w-[600px] h-[600px] rounded-full pointer-events-none opacity-15"
        style={{ 
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          top: '5%', 
          right: '-15%',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
        style={{ 
          background: 'radial-gradient(circle, var(--teal) 0%, transparent 70%)',
          bottom: '10%', 
          left: '-10%',
          filter: 'blur(60px)',
        }}
      />
      
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <motion.div 
            className="mb-12"
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
                Token Creator
              </span>
            </motion.div>
            
            <motion.h1 variants={fadeUpVariant} className="heading-lg mb-4">
              Launch your
              <br />
              <span className="text-italic">token</span>
              <span className="text-[var(--accent)]">.</span>
            </motion.h1>
            
            <motion.p variants={fadeUpVariant} className="text-body max-w-lg">
              Configure and deploy your token in minutes with built-in automation.
            </motion.p>
          </motion.div>

          {/* Step Indicator - Minimal editorial style */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => i <= currentStepIndex && setStep(s.id)}
                  disabled={i > currentStepIndex}
                  className={`group relative transition-all duration-300 ${
                    i > currentStepIndex ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className={`px-5 py-3 transition-all duration-300 ${
                    s.id === step 
                      ? 'text-[var(--ink)]' 
                      : i < currentStepIndex 
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--ink-faded)]'
                  }`}>
                    <span className="font-serif text-2xl md:text-3xl">{s.label}</span>
                  </div>
                  {/* Active underline */}
                  <div className={`absolute bottom-0 left-5 right-5 h-[2px] transition-all duration-300 ${
                    s.id === step 
                      ? 'bg-[var(--accent)]' 
                      : i < currentStepIndex 
                      ? 'bg-[var(--accent)]/30'
                      : 'bg-transparent'
                  }`} />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Step Content Card */}
          <motion.div 
            className="rounded-[1.5rem] bg-[var(--bg-warm)]/80 backdrop-blur-sm relative overflow-hidden shadow-[0_8px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/60"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="p-8 md:p-10">
              {/* Platform Selection */}
              {step === "platform" && (
                <motion.div
                  key="platform"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-serif text-[var(--ink-faded)] text-sm">01</span>
                    <div className="w-6 h-px bg-[var(--ink)]/20" />
                  </div>
                  <h2 className="font-serif text-2xl mb-2">Select Launchpad</h2>
                  <p className="text-[var(--ink-muted)] mb-8">
                    Choose which platform to deploy your token on.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {platforms.map((platform, i) => (
                      <motion.button
                        key={platform.id}
                        onClick={() => platform.status === "live" && setSelectedPlatform(platform.id)}
                        disabled={platform.status !== "live"}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`text-left p-5 rounded-xl border-2 transition-all ${
                          selectedPlatform === platform.id 
                            ? 'border-[var(--accent)] bg-white/80 shadow-lg' 
                            : 'border-[var(--ink)]/10 bg-white/40 hover:border-[var(--ink)]/20 hover:bg-white/60'
                        } ${platform.status !== "live" ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-serif text-xl">{platform.name}</span>
                          {selectedPlatform === platform.id && (
                            <span className="text-[var(--accent)] font-serif text-sm italic">Selected</span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--ink-muted)] mb-4">
                          {platform.description}
                        </p>
                        {platform.status === "coming" ? (
                          <span className="text-xs text-[var(--ink-faded)] italic">Coming soon</span>
                        ) : (
                          <span className="text-xs text-[var(--accent)] italic">Ready to use</span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Feature Selection */}
              {step === "features" && (
                <motion.div
                  key="features"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-serif text-[var(--ink-faded)] text-sm">02</span>
                    <div className="w-6 h-px bg-[var(--ink)]/20" />
                  </div>
                  <h2 className="font-serif text-2xl mb-2">Configure Features</h2>
                  <p className="text-[var(--ink-muted)] mb-8">
                    Enable the tokenomics features you want.
                  </p>

                  <div className="space-y-3">
                    {availableFeatures.map((feature, i) => (
                      <motion.button
                        key={feature.id}
                        onClick={() => toggleFeature(feature.id)}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                          selectedFeatures.includes(feature.id) 
                            ? 'border-[var(--accent)] bg-white/80 shadow-lg' 
                            : 'border-[var(--ink)]/10 bg-white/40 hover:border-[var(--ink)]/20 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                            selectedFeatures.includes(feature.id)
                              ? 'border-[var(--accent)] bg-transparent'
                              : 'border-[var(--ink)]/15 bg-transparent'
                          }`}>
                            {selectedFeatures.includes(feature.id) && (
                              <div className="w-2 h-2 bg-[var(--accent)]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-serif text-lg">{feature.name}</span>
                              {feature.recommended && (
                                <span className="text-xs text-[var(--accent)] italic">recommended</span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--ink-muted)]">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Token Details */}
              {step === "details" && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-serif text-[var(--ink-faded)] text-sm">03</span>
                    <div className="w-6 h-px bg-[var(--ink)]/20" />
                  </div>
                  <h2 className="font-serif text-2xl mb-2">Token Details</h2>
                  <p className="text-[var(--ink-muted)] mb-8">
                    Enter the basic information for your token.
                  </p>

                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="block text-sm font-medium mb-2 text-[var(--ink)]">Token Name</label>
                      <input
                        type="text"
                        value={tokenDetails.name}
                        onChange={(e) => setTokenDetails(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Doge Coin"
                        className="w-full px-5 py-4 bg-white/60 border border-[var(--ink)]/10 rounded-xl text-[var(--ink)] placeholder:text-[var(--ink-faded)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <label className="block text-sm font-medium mb-2 text-[var(--ink)]">Symbol</label>
                      <input
                        type="text"
                        value={tokenDetails.symbol}
                        onChange={(e) => setTokenDetails(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                        placeholder="e.g. DOGE"
                        maxLength={10}
                        className="w-full px-5 py-4 bg-white/60 border border-[var(--ink)]/10 rounded-xl text-[var(--ink)] placeholder:text-[var(--ink-faded)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-sm font-medium mb-2 text-[var(--ink)]">
                        Description <span className="text-[var(--ink-faded)] font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={tokenDetails.description}
                        onChange={(e) => setTokenDetails(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your token..."
                        rows={3}
                        className="w-full px-5 py-4 bg-white/60 border border-[var(--ink)]/10 rounded-xl text-[var(--ink)] placeholder:text-[var(--ink-faded)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <label className="block text-sm font-medium mb-2 text-[var(--ink)]">Token Image</label>
                      <div className="border-2 border-dashed border-[var(--ink)]/10 rounded-xl p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer bg-white/40">
                        <div className="w-14 h-14 rounded-xl bg-[var(--bg-soft)] mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-7 h-7 text-[var(--ink-faded)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-[var(--ink-soft)]">Click to upload</p>
                        <p className="text-xs text-[var(--ink-faded)] mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Review */}
              {step === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-serif text-[var(--ink-faded)] text-sm">04</span>
                    <div className="w-6 h-px bg-[var(--ink)]/20" />
                  </div>
                  <h2 className="font-serif text-2xl mb-2">Review & Deploy</h2>
                  <p className="text-[var(--ink-muted)] mb-8">
                    Confirm your configuration before launching.
                  </p>

                  <div className="space-y-4">
                    {/* Platform */}
                    <motion.div 
                      className="p-5 bg-white/60 rounded-xl border border-[var(--ink)]/5"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="text-xs text-[var(--ink-faded)] uppercase tracking-wider mb-2">Platform</div>
                      <div className="font-serif text-xl">
                        {platforms.find(p => p.id === selectedPlatform)?.name}
                      </div>
                    </motion.div>

                    {/* Features */}
                    <motion.div 
                      className="p-5 bg-white/60 rounded-xl border border-[var(--ink)]/5"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <div className="text-xs text-[var(--ink-faded)] uppercase tracking-wider mb-3">Active Features</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeatures.map(fId => {
                          const feature = availableFeatures.find(f => f.id === fId);
                          return feature ? (
                            <span key={fId} className="text-sm bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1.5 rounded-lg font-medium">
                              {feature.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </motion.div>

                    {/* Token Info */}
                    <motion.div 
                      className="p-5 bg-white/60 rounded-xl border border-[var(--ink)]/5"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="text-xs text-[var(--ink-faded)] uppercase tracking-wider mb-4">Token</div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs text-[var(--ink-faded)]">Name</div>
                          <div className="font-serif text-lg">{tokenDetails.name || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--ink-faded)]">Symbol</div>
                          <div className="font-serif text-lg">${tokenDetails.symbol || "—"}</div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Notice */}
                    <motion.div 
                      className="p-5 bg-amber-50 border border-amber-200/50 rounded-xl"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <p className="text-sm text-amber-800">
                        <span className="font-semibold">Note:</span> Token creation is irreversible and requires a small SOL fee. Ensure all details are correct.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10 pt-8 border-t border-[var(--ink)]/5">
                <button
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                    currentStepIndex === 0 
                      ? 'opacity-30 cursor-not-allowed text-[var(--ink-faded)]' 
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--ink)]/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>

                {step === "review" ? (
                  <motion.button 
                    className="flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--ink)] text-[var(--bg-cream)] font-medium hover:bg-[var(--accent)] transition-all hover:-translate-y-0.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Deploy Token
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className={`flex items-center gap-2 px-8 py-4 rounded-full font-medium transition-all ${
                      !canProceed() 
                        ? 'opacity-50 cursor-not-allowed bg-[var(--ink)]/20 text-[var(--ink-faded)]' 
                        : 'bg-[var(--ink)] text-[var(--bg-cream)] hover:bg-[var(--accent)] hover:-translate-y-0.5'
                    }`}
                    whileHover={canProceed() ? { scale: 1.02 } : {}}
                    whileTap={canProceed() ? { scale: 0.98 } : {}}
                  >
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
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
