"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface TokenSettings {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  platform: string;
  status: string;
  // Feature toggles
  feature_buyback_enabled: boolean;
  feature_buyback_percent: number;
  feature_autoliq_enabled: boolean;
  feature_autoliq_percent: number;
  feature_revshare_enabled: boolean;
  feature_revshare_percent: number;
  feature_jackpot_enabled: boolean;
  feature_jackpot_percent: number;
  feature_jackpot_min_hold: number;
  feature_keep_percent: number;
  job_interval_seconds: number;
  job_paused: boolean;
  // Stats
  total_fees_claimed: number;
  total_buyback: number;
  total_burned: number;
  total_lp_added: number;
  total_revshare_paid: number;
  total_jackpot_paid: number;
}

export default function TokenSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tokenId = params.id as string;

  const [token, setToken] = useState<TokenSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Feature settings state
  const [settings, setSettings] = useState({
    buybackEnabled: false,
    buybackPercent: 0,
    autoliqEnabled: false,
    autoliqPercent: 0,
    revshareEnabled: false,
    revsharePercent: 0,
    jackpotEnabled: false,
    jackpotPercent: 0,
    jackpotMinHold: 0,
    keepPercent: 100,
    jobInterval: 30,
    jobPaused: false,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchToken();
  }, [user, tokenId, router]);

  const fetchToken = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tokens/${tokenId}`);
      const data = await response.json();

      if (response.ok) {
        setToken(data);
        setSettings({
          buybackEnabled: data.feature_buyback_enabled || false,
          buybackPercent: data.feature_buyback_percent || 0,
          autoliqEnabled: data.feature_autoliq_enabled || false,
          autoliqPercent: data.feature_autoliq_percent || 0,
          revshareEnabled: data.feature_revshare_enabled || false,
          revsharePercent: data.feature_revshare_percent || 0,
          jackpotEnabled: data.feature_jackpot_enabled || false,
          jackpotPercent: data.feature_jackpot_percent || 0,
          jackpotMinHold: data.feature_jackpot_min_hold || 0,
          keepPercent: data.feature_keep_percent || 100,
          jobInterval: data.job_interval_seconds || 30,
          jobPaused: data.job_paused || false,
        });
      } else {
        setError(data.error || "Token not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch token");
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!token || !user) return;

    // Validate total percentage
    const total = settings.buybackPercent + settings.autoliqPercent + 
                  settings.revsharePercent + settings.jackpotPercent + 
                  settings.keepPercent;
    if (total !== 100) {
      setError(`Total allocation must be 100%. Currently: ${total}%`);
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/tokens/${tokenId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          feature_buyback_enabled: settings.buybackEnabled,
          feature_buyback_percent: settings.buybackPercent,
          feature_autoliq_enabled: settings.autoliqEnabled,
          feature_autoliq_percent: settings.autoliqPercent,
          feature_revshare_enabled: settings.revshareEnabled,
          feature_revshare_percent: settings.revsharePercent,
          feature_jackpot_enabled: settings.jackpotEnabled,
          feature_jackpot_percent: settings.jackpotPercent,
          feature_jackpot_min_hold: settings.jackpotMinHold,
          feature_keep_percent: settings.keepPercent,
          job_interval_seconds: settings.jobInterval,
          job_paused: settings.jobPaused,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Settings saved successfully!");
        await fetchToken();
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    }
    setIsSaving(false);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Jackpot and Revenue Share are mutually exclusive
      if (key === "jackpotEnabled" && value === true) {
        newSettings.revshareEnabled = false;
        newSettings.revsharePercent = 0;
      }
      if (key === "revshareEnabled" && value === true) {
        newSettings.jackpotEnabled = false;
        newSettings.jackpotPercent = 0;
      }
      
      return newSettings;
    });
  };

  // Calculate remaining percentage
  const usedPercent = (settings.buybackEnabled ? settings.buybackPercent : 0) +
                      (settings.autoliqEnabled ? settings.autoliqPercent : 0) +
                      (settings.revshareEnabled ? settings.revsharePercent : 0) +
                      (settings.jackpotEnabled ? settings.jackpotPercent : 0);
  const remainingPercent = 100 - usedPercent;

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-cream)]">
        <Header />
        <main className="max-w-4xl mx-auto px-6 pt-28">
          <div className="flex items-center justify-center h-64">
            <div className="loader" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-[var(--bg-cream)]">
        <Header />
        <main className="max-w-4xl mx-auto px-6 pt-28">
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <h2 className="font-serif text-xl text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <Link href="/dashboard" className="text-red-700 hover:underline mt-4 block">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard" className="text-[var(--ink-muted)] hover:text-[var(--ink)] mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {token?.symbol?.charAt(0) || "?"}
            </div>
            <div>
              <h1 className="font-serif text-3xl">{token?.name} Settings</h1>
              <p className="text-[var(--ink-muted)]">${token?.symbol}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--ink)]/5">
            <div className="text-xs text-[var(--ink-faded)]">Total Claimed</div>
            <div className="font-serif text-xl">{token?.total_fees_claimed?.toFixed(4) || 0} SOL</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--ink)]/5">
            <div className="text-xs text-[var(--ink-faded)]">Buyback</div>
            <div className="font-serif text-xl">{token?.total_buyback?.toFixed(4) || 0} SOL</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--ink)]/5">
            <div className="text-xs text-[var(--ink-faded)]">LP Added</div>
            <div className="font-serif text-xl">{token?.total_lp_added?.toFixed(4) || 0} SOL</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--ink)]/5">
            <div className="text-xs text-[var(--ink-faded)]">Jackpot Paid</div>
            <div className="font-serif text-xl">{token?.total_jackpot_paid?.toFixed(4) || 0} SOL</div>
          </div>
        </motion.div>

        {/* Allocation Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5 mb-8"
        >
          <h2 className="font-serif text-xl mb-4">Fee Allocation</h2>
          <div className="h-8 rounded-full overflow-hidden flex bg-gray-200">
            {settings.buybackEnabled && settings.buybackPercent > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${settings.buybackPercent}%` }}
              >
                {settings.buybackPercent > 10 && `${settings.buybackPercent}%`}
              </div>
            )}
            {settings.autoliqEnabled && settings.autoliqPercent > 0 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${settings.autoliqPercent}%` }}
              >
                {settings.autoliqPercent > 10 && `${settings.autoliqPercent}%`}
              </div>
            )}
            {settings.revshareEnabled && settings.revsharePercent > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${settings.revsharePercent}%` }}
              >
                {settings.revsharePercent > 10 && `${settings.revsharePercent}%`}
              </div>
            )}
            {settings.jackpotEnabled && settings.jackpotPercent > 0 && (
              <div
                className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${settings.jackpotPercent}%` }}
              >
                {settings.jackpotPercent > 10 && `${settings.jackpotPercent}%`}
              </div>
            )}
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${remainingPercent}%` }}
            >
              {remainingPercent > 10 && `${remainingPercent}%`}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Buyback & Burn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Auto Liquidity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Revenue Share</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Jackpot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>Keep (Wallet)</span>
            </div>
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Job Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5">
            <h2 className="font-serif text-xl mb-4">Automation Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-Feed Enabled</h3>
                  <p className="text-sm text-[var(--ink-muted)]">Automatically claim and distribute fees</p>
                </div>
                <button
                  onClick={() => updateSetting("jobPaused", !settings.jobPaused)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    !settings.jobPaused ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    !settings.jobPaused ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Interval (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={settings.jobInterval}
                  onChange={(e) => updateSetting("jobInterval", parseInt(e.target.value) || 30)}
                  className="w-24 px-3 py-2 rounded-lg border border-[var(--ink)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          {/* Buyback & Burn */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl">Buyback & Burn</h2>
                <p className="text-sm text-[var(--ink-muted)]">Buy tokens with fees and burn them</p>
              </div>
              <button
                onClick={() => updateSetting("buybackEnabled", !settings.buybackEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.buybackEnabled ? "bg-red-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.buybackEnabled ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            {settings.buybackEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Percentage of fees</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.buybackPercent}
                    onChange={(e) => updateSetting("buybackPercent", parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{settings.buybackPercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Auto Liquidity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl">Auto Liquidity</h2>
                <p className="text-sm text-[var(--ink-muted)]">Add fees to liquidity pool</p>
              </div>
              <button
                onClick={() => updateSetting("autoliqEnabled", !settings.autoliqEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoliqEnabled ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.autoliqEnabled ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            {settings.autoliqEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Percentage of fees</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.autoliqPercent}
                    onChange={(e) => updateSetting("autoliqPercent", parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{settings.autoliqPercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Revenue Share */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl">Revenue Share</h2>
                <p className="text-sm text-[var(--ink-muted)]">Distribute fees to token holders</p>
              </div>
              <button
                onClick={() => updateSetting("revshareEnabled", !settings.revshareEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.revshareEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.revshareEnabled ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            {settings.revshareEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Percentage of fees</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.revsharePercent}
                    onChange={(e) => updateSetting("revsharePercent", parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{settings.revsharePercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Jackpot */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[var(--ink)]/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl">Jackpot Rewards</h2>
                <p className="text-sm text-[var(--ink-muted)]">Random rewards for lucky holders</p>
              </div>
              <button
                onClick={() => updateSetting("jackpotEnabled", !settings.jackpotEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.jackpotEnabled ? "bg-yellow-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.jackpotEnabled ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            {settings.jackpotEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Percentage of fees</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.jackpotPercent}
                      onChange={(e) => updateSetting("jackpotPercent", parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-medium">{settings.jackpotPercent}%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum tokens to hold</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.jackpotMinHold}
                    onChange={(e) => updateSetting("jackpotMinHold", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--ink)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl">
              {success}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-[var(--ink)] text-white rounded-xl font-medium hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}






