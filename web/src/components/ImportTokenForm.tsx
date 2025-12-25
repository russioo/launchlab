"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import bs58 from "bs58";
import { importToken } from "@/lib/api";

export function ImportTokenForm() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    mint: "",
    privateKey: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [importedToken, setImportedToken] = useState<{
    name: string;
    symbol: string;
    mint: string;
    imageUrl: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      setVisible(true);
      return;
    }

    if (!formData.mint) {
      setError("Mint address is required");
      return;
    }

    if (!formData.privateKey) {
      setError("Private key is required for automation");
      return;
    }

    // Validate private key format
    try {
      const keyBytes = bs58.decode(formData.privateKey);
      if (keyBytes.length !== 64) {
        setError("Invalid private key format");
        return;
      }
    } catch {
      setError("Invalid private key");
      return;
    }

    setIsLoading(true);

    try {
      const result = await importToken({
        mint: formData.mint.trim(),
        creatorWallet: publicKey.toBase58(),
        devPrivateKey: formData.privateKey,
      });

      setImportedToken({
        name: result.name,
        symbol: result.symbol,
        mint: result.mint,
        imageUrl: result.imageUrl,
      });
      setSuccess(true);

      setTimeout(() => {
        router.push(`/token/${result.mint}`);
      }, 2000);

    } catch (error: unknown) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to import token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && importedToken && (
        <div className="p-4 bg-[var(--success-muted)] border border-[var(--success)] rounded-xl">
          <div className="flex items-center gap-3">
            {importedToken.imageUrl && (
              <img 
                src={importedToken.imageUrl} 
                alt={importedToken.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
            )}
            <div>
              <div className="flex items-center gap-2 text-[var(--success)] font-medium mb-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Token imported!
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {importedToken.name} ({importedToken.symbol})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mint Address */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Mint address <span className="text-[var(--accent)]">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          The token contract address from Pump.fun
        </p>
        <input
          type="text"
          value={formData.mint}
          onChange={(e) => setFormData({ ...formData, mint: e.target.value })}
          placeholder="e.g. 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-mono"
        />
      </div>

      {/* Private Key */}
      <div className="pt-4 border-t border-[var(--border)]">
        <label className="block text-sm font-medium mb-2">
          Private key <span className="text-[var(--accent)]">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {connected 
            ? `Of wallet: ${publicKey?.toBase58().slice(0, 8)}...`
            : "Connect wallet to continue"
          }
        </p>
        <input
          type="password"
          value={formData.privateKey}
          onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
          placeholder="Paste your private key"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-mono"
        />
      </div>

      {/* Submit */}
      {!connected ? (
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="w-full py-4 bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white rounded-xl text-base font-medium hover:opacity-90 transition-opacity"
        >
          Connect wallet to import
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !formData.mint || !formData.privateKey}
          className="w-full py-4 bg-[var(--bg-dark)] text-white rounded-xl text-base font-medium disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] hover:bg-[var(--text)] transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? "Importing..." : "Import token"}
        </button>
      )}
    </form>
  );
}

