"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { deployToken } from "@/lib/auth";
import { motion } from "framer-motion";

const platforms = [
  { id: "pumpfun", name: "PUMP.FUN", desc: "Original memecoin launchpad", status: "live" },
  { id: "bags", name: "BAGS.FM", desc: "Token-2022 with creator fees", status: "live" },
  { id: "usd1", name: "USD1", desc: "Stablecoin launchpad", status: "live" },
  { id: "moonshot", name: "MOONSHOT", desc: "Dexscreener's launchpad", status: "coming" },
];

interface FeatureDefinition {
  id: string;
  name: string;
  desc: string;
  platforms: string[];
  group?: string;
}

const featureDefinitions: Record<string, FeatureDefinition> = {
  buyback_burn: { id: "buyback_burn", name: "Buyback & Burn", desc: "Auto buy + burn tokens", platforms: ["pumpfun", "bags", "bonk"] },
  auto_liquidity: { id: "auto_liquidity", name: "Auto-Liquidity", desc: "Fees → LP depth", platforms: ["pumpfun"] },
  jackpot: { id: "jackpot", name: "Jackpot", desc: "Random holder rewards", platforms: ["pumpfun", "bags", "bonk"], group: "rewards" },
  revenue_share: { id: "revenue_share", name: "Revenue Share", desc: "Distribute to holders", platforms: ["pumpfun", "bags", "bonk"], group: "rewards" },
};

type FeatureId = "buyback_burn" | "auto_liquidity" | "jackpot" | "revenue_share";
type Step = "platform" | "features" | "details" | "review";

export default function LaunchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<FeatureId, { enabled: boolean; percent: number }>>({
    buyback_burn: { enabled: true, percent: 50 },
    auto_liquidity: { enabled: false, percent: 0 },
    jackpot: { enabled: false, percent: 0 },
    revenue_share: { enabled: false, percent: 0 },
  });
  const [tokenDetails, setTokenDetails] = useState({
    name: "", symbol: "", description: "", image: null as File | null, imagePreview: null as string | null, initialBuy: 0.01,
  });
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: { id: Step; label: string }[] = [
    { id: "platform", label: "01 Platform" },
    { id: "features", label: "02 Features" },
    { id: "details", label: "03 Details" },
    { id: "review", label: "04 Review" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const isFeatureAvailable = (id: FeatureId) => selectedPlatform ? featureDefinitions[id].platforms.includes(selectedPlatform) : false;
  const totalPercent = Object.values(features).reduce((s, f) => s + (f.enabled ? f.percent : 0), 0);

  const toggleFeature = (id: FeatureId) => {
    if (!isFeatureAvailable(id)) return;
    const feat = featureDefinitions[id];
    setFeatures(prev => {
      const newF = { ...prev };
      if (!prev[id].enabled && feat.group === "rewards") {
        Object.keys(featureDefinitions).forEach(k => {
          if (featureDefinitions[k as FeatureId].group === "rewards" && k !== id) {
            newF[k as FeatureId] = { ...newF[k as FeatureId], enabled: false, percent: 0 };
          }
        });
      }
      newF[id] = { ...newF[id], enabled: !prev[id].enabled, percent: !prev[id].enabled ? 25 : 0 };
      return newF;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTokenDetails(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => setTokenDetails(prev => ({ ...prev, imagePreview: e.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const canProceed = () => {
    if (step === "platform") return !!selectedPlatform;
    if (step === "features") return Object.values(features).some(f => f.enabled) && totalPercent <= 100;
    if (step === "details") return tokenDetails.name && tokenDetails.symbol && tokenDetails.image;
    return true;
  };

  const nextStep = () => currentStepIndex + 1 < steps.length && setStep(steps[currentStepIndex + 1].id);
  const prevStep = () => currentStepIndex > 0 && setStep(steps[currentStepIndex - 1].id);

  const handleDeploy = async () => {
    if (!user) { router.push("/login"); return; }
    setDeploying(true);
    setError(null);
    try {
      const enabledFeatures = Object.entries(features).filter(([, c]) => c.enabled).map(([id]) => id);
      const result = await deployToken({
        userId: user.id, platform: selectedPlatform!, name: tokenDetails.name, symbol: tokenDetails.symbol,
        description: tokenDetails.description, initialBuy: tokenDetails.initialBuy, features: enabledFeatures, image: tokenDetails.image || undefined,
      });
      router.push(`/token/${result.mint || result.tokenId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to deploy");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container max-w-4xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <span className="text-small text-[var(--lime)] mb-4 block">Token Creator</span>
            <h1 className="heading-xl">LAUNCH<br /><span className="text-[var(--grey-400)]">TOKEN</span></h1>
          </motion.div>

          {/* Step Tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => i <= currentStepIndex && setStep(s.id)}
                disabled={i > currentStepIndex}
                className={`px-6 py-4 text-small whitespace-nowrap transition-all ${
                  s.id === step ? 'bg-[var(--lime)] text-black' : i < currentStepIndex ? 'bg-[var(--grey-200)] text-white' : 'bg-[var(--grey-100)] text-[var(--grey-500)]'
                } ${i > currentStepIndex ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--grey-200)]'}`}
              >
                {s.label}
              </button>
            ))}
          </motion.div>

          {/* Content Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[var(--grey-100)] border border-[var(--grey-200)] p-8 md:p-10"
          >
            {/* Platform Step */}
            {step === "platform" && (
              <div>
                <h2 className="heading-md mb-2">Select Platform</h2>
                <p className="text-body mb-8">Choose your launchpad</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {platforms.map((p, i) => (
                    <motion.button
                      key={p.id}
                      onClick={() => p.status === "live" && setSelectedPlatform(p.id)}
                      disabled={p.status !== "live"}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`text-left p-6 border-2 transition-all ${
                        selectedPlatform === p.id ? 'border-[var(--lime)] bg-[var(--lime-soft)]' : 'border-[var(--grey-200)] hover:border-[var(--grey-400)]'
                      } ${p.status !== "live" ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-display text-2xl">{p.name}</span>
                        {selectedPlatform === p.id && <span className="badge badge-live">Selected</span>}
                      </div>
                      <p className="text-body text-sm mb-3">{p.desc}</p>
                      <span className={`text-small ${p.status === "live" ? 'text-[var(--lime)]' : 'text-[var(--grey-500)]'}`}>
                        {p.status === "live" ? "● READY" : "○ SOON"}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Features Step */}
            {step === "features" && (
              <div>
                <h2 className="heading-md mb-2">Configure Features</h2>
                <p className="text-body mb-8">Enable automation for your token</p>
                <div className="space-y-3">
                  {Object.values(featureDefinitions).map((feat, i) => {
                    const id = feat.id as FeatureId;
                    const config = features[id];
                    const available = isFeatureAvailable(id);
                    return (
                      <motion.div
                        key={feat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`border-2 transition-all ${config.enabled && available ? 'border-[var(--lime)]' : 'border-[var(--grey-200)]'} ${!available ? 'opacity-50' : ''}`}
                      >
                        <button onClick={() => toggleFeature(id)} disabled={!available} className="w-full p-5 flex items-center justify-between text-left">
                          <div className="flex items-center gap-4">
                            <div className={`w-5 h-5 border-2 flex items-center justify-center ${config.enabled && available ? 'border-[var(--lime)] bg-[var(--lime)]' : 'border-[var(--grey-400)]'} ${!available ? 'border-[var(--grey-500)] bg-[var(--grey-300)]' : ''}`}>
                              {config.enabled && available && <span className="text-black text-xs">✓</span>}
                              {!available && <span className="text-[var(--grey-500)] text-xs">✕</span>}
                            </div>
                            <div>
                              <span className={`font-medium ${!available ? 'line-through text-[var(--grey-500)]' : ''}`}>{feat.name}</span>
                              <p className={`text-body text-sm ${!available ? 'line-through' : ''}`}>{feat.desc}</p>
                              {!available && <span className="text-small text-red-400 block mt-1">Pump.fun only</span>}
                            </div>
                          </div>
                          {config.enabled && available && <span className="font-display text-2xl text-[var(--lime)]">{config.percent}%</span>}
                        </button>
                        {config.enabled && available && (
                          <div className="px-5 pb-5 flex gap-2">
                            {[10, 25, 50, 75, 100].map(pct => (
                              <button
                                key={pct}
                                onClick={(e) => { e.stopPropagation(); setFeatures(prev => ({ ...prev, [id]: { ...prev[id], percent: pct } })); }}
                                className={`flex-1 py-3 text-small transition-all ${config.percent === pct ? 'bg-[var(--lime)] text-black' : 'bg-[var(--grey-200)] text-white hover:bg-[var(--grey-300)]'}`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <div className={`mt-6 p-4 flex items-center justify-between ${totalPercent > 100 ? 'bg-red-900/30 border border-red-500' : 'bg-[var(--grey-200)]'}`}>
                  <span className="font-medium">Total Allocated</span>
                  <span className="font-display text-3xl">{totalPercent}%</span>
                </div>
              </div>
            )}

            {/* Details Step */}
            {step === "details" && (
              <div>
                <h2 className="heading-md mb-2">Token Details</h2>
                <p className="text-body mb-8">Enter your token information</p>
                <div className="space-y-6">
                  <div>
                    <label className="text-small block mb-2">IMAGE *</label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-2 border-dashed border-[var(--grey-300)] hover:border-[var(--lime)] transition-colors text-center">
                      {tokenDetails.imagePreview ? (
                        <div className="flex flex-col items-center">
                          <img src={tokenDetails.imagePreview} alt="Preview" className="w-20 h-20 object-cover mb-3" />
                          <span className="text-small text-[var(--lime)]">CHANGE IMAGE</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--grey-200)] flex items-center justify-center"><span className="text-2xl">+</span></div>
                          <span className="text-body">Click to upload</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div>
                    <label className="text-small block mb-2">NAME *</label>
                    <input type="text" value={tokenDetails.name} onChange={(e) => setTokenDetails(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Doge Coin" className="input" />
                  </div>
                  <div>
                    <label className="text-small block mb-2">SYMBOL *</label>
                    <input type="text" value={tokenDetails.symbol} onChange={(e) => setTokenDetails(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))} placeholder="e.g. DOGE" maxLength={10} className="input" />
                  </div>
                  <div>
                    <label className="text-small block mb-2">DESCRIPTION</label>
                    <textarea value={tokenDetails.description} onChange={(e) => setTokenDetails(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description..." rows={3} className="input resize-none" />
                  </div>
                  <div>
                    <label className="text-small block mb-2">INITIAL BUY (SOL)</label>
                    <input type="number" step="0.01" min="0.01" value={tokenDetails.initialBuy} onChange={(e) => setTokenDetails(prev => ({ ...prev, initialBuy: parseFloat(e.target.value) || 0.01 }))} className="input" />
                  </div>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === "review" && (
              <div>
                <h2 className="heading-md mb-2">Review & Deploy</h2>
                <p className="text-body mb-8">Confirm before launching</p>
                <div className="space-y-4">
                  <div className="p-5 bg-[var(--grey-200)]">
                    <span className="text-small text-[var(--grey-500)] block mb-1">PLATFORM</span>
                    <span className="font-display text-2xl">{platforms.find(p => p.id === selectedPlatform)?.name}</span>
                  </div>
                  <div className="p-5 bg-[var(--grey-200)] flex items-center gap-4">
                    {tokenDetails.imagePreview && <img src={tokenDetails.imagePreview} alt="Token" className="w-14 h-14 object-cover" />}
                    <div>
                      <span className="font-display text-2xl block">{tokenDetails.name}</span>
                      <span className="text-body">${tokenDetails.symbol}</span>
                    </div>
                  </div>
                  <div className="p-5 bg-[var(--grey-200)]">
                    <span className="text-small text-[var(--grey-500)] block mb-3">ACTIVE FEATURES</span>
                    <div className="space-y-2">
                      {Object.entries(features).filter(([, c]) => c.enabled).map(([id, c]) => (
                        <div key={id} className="flex justify-between">
                          <span>{featureDefinitions[id as FeatureId].name}</span>
                          <span className="text-[var(--lime)] font-mono">{c.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && <div className="p-5 bg-red-900/30 border border-red-500 text-red-300">{error}</div>}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-[var(--grey-200)]">
              <button onClick={prevStep} className={`btn btn-ghost ${currentStepIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}>← Back</button>
              {step === "review" ? (
                <button onClick={handleDeploy} disabled={deploying || !user} className="btn btn-primary">
                  {deploying ? "Deploying..." : user ? "Deploy Token →" : "Login to Deploy"}
                </button>
              ) : (
                <button onClick={nextStep} disabled={!canProceed()} className={`btn btn-primary ${!canProceed() ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  Continue →
                </button>
              )}
            </div>
          </motion.div>
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
