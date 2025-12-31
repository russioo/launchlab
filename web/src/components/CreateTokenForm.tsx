"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { createToken } from "@/lib/api";

type Platform = "pumpfun" | "bonk" | "bags";

export function CreateTokenForm() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [platform, setPlatform] = useState<Platform>("pumpfun");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [initialBuy, setInitialBuy] = useState("0.05");

  // Features
  const [enableBuyback, setEnableBuyback] = useState(true);
  const [enableAutoLP, setEnableAutoLP] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [createdMint, setCreatedMint] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Remove the data:image/...;base64, prefix for API
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please sign in to launch a token");
      return;
    }

    if (!name.trim() || !symbol.trim()) {
      setError("Name and symbol are required");
      return;
    }

    if (!privateKey.trim()) {
      setError("Private key is required for automation");
      return;
    }

    setIsSubmitting(true);
    setStep("processing");

    try {
      const result = await createToken({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        image: imageBase64 || undefined,
        twitter: twitter.trim() || undefined,
        telegram: telegram.trim() || undefined,
        website: website.trim() || undefined,
        creatorWallet: user.wallet.publicKey,
        devPrivateKey: privateKey.trim(),
        initialBuySol: parseFloat(initialBuy) || 0.05,
      });

      setCreatedMint(result.mint);
      setStep("success");

      // Redirect to token page after delay
      setTimeout(() => {
        router.push(`/token/${result.tokenId}`);
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create token");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl mb-2">Creating your token...</h3>
        <p className="text-[var(--ink-muted)]">This may take a minute</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl mb-2">Token launched!</h3>
        <p className="text-[var(--ink-muted)] mb-4">
          {createdMint && (
            <span className="font-mono text-sm break-all">{createdMint}</span>
          )}
        </p>
        <p className="text-sm text-[var(--ink-faded)]">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Platform selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-3">
          Platform
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "pumpfun", name: "Pump.fun", status: "live" },
            { id: "bonk", name: "Bonk", status: "soon" },
            { id: "bags", name: "Bags", status: "soon" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => p.status === "live" && setPlatform(p.id as Platform)}
              className={`relative py-4 px-3 rounded-xl border transition-all ${
                platform === p.id
                  ? "border-[var(--ink)] bg-[var(--ink)]/5"
                  : p.status === "soon"
                  ? "border-[var(--ink)]/10 opacity-50 cursor-not-allowed"
                  : "border-[var(--ink)]/10 hover:border-[var(--ink)]/30"
              }`}
              disabled={p.status === "soon"}
            >
              <span className="font-medium text-sm">{p.name}</span>
              {p.status === "soon" && (
                <span className="absolute top-1 right-1 text-[10px] text-[var(--ink-faded)] italic">
                  soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Token info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
            Token Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Token"
            className="input"
            maxLength={32}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
            Symbol *
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="MTK"
            className="input"
            maxLength={10}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the world about your token..."
          className="input min-h-[100px] resize-none"
          maxLength={500}
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
          Token Image
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-[var(--ink)]/10 rounded-xl hover:border-[var(--ink)]/30 transition-colors group"
        >
          {imagePreview ? (
            <div className="flex items-center justify-center gap-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover"
              />
              <span className="text-sm text-[var(--ink-muted)] group-hover:text-[var(--ink)]">
                Click to change
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-8 h-8 text-[var(--ink-faded)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-[var(--ink-muted)]">
                Upload image (PNG, JPG)
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Socials */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink-muted)]">
          Social Links (optional)
        </label>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--ink-muted)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://twitter.com/..."
              className="input flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--ink-muted)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="https://t.me/..."
              className="input flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
            </div>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="input flex-1"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--ink)]/10" />

      {/* Automation settings */}
      <div>
        <h3 className="font-medium mb-4">Automation</h3>
        <div className="space-y-0">
          <div className="feature-toggle" onClick={() => setEnableBuyback(!enableBuyback)}>
            <span className="toggle-label">Auto Buyback</span>
            <div className={`toggle-switch ${enableBuyback ? "active" : ""}`} />
          </div>
          <div className="feature-toggle" onClick={() => setEnableAutoLP(!enableAutoLP)}>
            <span className="toggle-label">Auto Add Liquidity</span>
            <div className={`toggle-switch ${enableAutoLP ? "active" : ""}`} />
          </div>
        </div>
      </div>

      {/* Initial buy */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
          Initial Dev Buy (SOL)
        </label>
        <input
          type="number"
          value={initialBuy}
          onChange={(e) => setInitialBuy(e.target.value)}
          placeholder="0.05"
          step="0.01"
          min="0"
          className="input"
        />
        <p className="text-xs text-[var(--ink-faded)] mt-1">
          Amount to buy on launch. Recommended: 0.05 SOL
        </p>
      </div>

      {/* Private key */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
          Automation Wallet Private Key *
        </label>
        <input
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Base58 encoded private key"
          className="input font-mono text-sm"
          required
        />
        <p className="text-xs text-[var(--ink-faded)] mt-1">
          This key will be used for automated fee claiming and buybacks
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !user}
        className="btn btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <div className="loader" />
            Creating...
          </span>
        ) : !user ? (
          "Sign in to launch"
        ) : (
          "Launch Token"
        )}
      </button>
    </form>
  );
}






