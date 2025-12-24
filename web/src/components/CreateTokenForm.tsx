"use client";

import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { Connection, VersionedTransaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createToken, confirmToken } from "@/lib/api";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || "79f04b6a-679c-420b-adc0-63e8109280ca";
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export function CreateTokenForm() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    twitter: "",
    telegram: "",
    website: "",
    privateKey: "",
    initialBuy: "0.01",
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setTxSignature(null);

    if (!connected || !publicKey || !signTransaction) {
      setVisible(true);
      return;
    }

    if (!formData.name || !formData.symbol) {
      setError("Name and symbol are required");
      return;
    }

    if (!image) {
      setError("Image is required");
      return;
    }

    if (!formData.privateKey) {
      setError("Private key is required for automation");
      return;
    }

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
      const connection = new Connection(RPC_URL, "confirmed");
      const balance = await connection.getBalance(publicKey);
      const minBalance = 0.1 * 1e9;
      
      if (balance < minBalance) {
        setError(`Need at least 0.1 SOL. You have ${(balance / 1e9).toFixed(4)} SOL`);
        setIsLoading(false);
        return;
      }

      setStatus("Uploading...");
      
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
      });

      setStatus("Preparing...");
      
      const result = await createToken({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description,
        image: imageBase64,
        twitter: formData.twitter || undefined,
        telegram: formData.telegram || undefined,
        website: formData.website || undefined,
        creatorWallet: publicKey.toBase58(),
        devPrivateKey: formData.privateKey,
        initialBuySol: parseFloat(formData.initialBuy) || 0,
      });

      if (!result.transaction || !result.mintSecretKey) {
        throw new Error("Failed to prepare transaction");
      }

      setStatus("Sign in wallet...");

      const txBuffer = Buffer.from(result.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);
      const mintKeypair = Keypair.fromSecretKey(bs58.decode(result.mintSecretKey));
      transaction.sign([mintKeypair]);
      const signedTx = await signTransaction(transaction);

      setStatus("Sending...");

      const signature = await connection.sendTransaction(signedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });

      setStatus("Confirming...");
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      setStatus("Finalizing...");
      await confirmToken(result.tokenId, { signature });

      setMintAddress(result.mint);
      setTxSignature(signature);
      setSuccess(true);
      setStatus("Success!");

      setTimeout(() => {
        router.push("/");
      }, 3000);

    } catch (error: unknown) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to create token");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bg)] rounded-full border border-[var(--border)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M22 10h-4a2 2 0 100 4h4"/>
            <circle cx="18" cy="12" r="1"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Connect your wallet</h3>
        <p className="text-[var(--text-muted)] text-sm mb-6">to launch a token</p>
        <button
          onClick={() => setVisible(true)}
          className="px-8 py-3 bg-[var(--bg-dark)] text-white rounded-full text-sm font-medium hover:bg-[var(--text)] transition-colors"
        >
          Connect
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-[var(--success-muted)] border border-[var(--success)] rounded-xl">
          <div className="flex items-center gap-2 text-[var(--success)] font-medium mb-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Token created!
          </div>
          {mintAddress && (
            <div className="font-mono text-xs text-[var(--text-muted)] break-all mb-2">
              {mintAddress}
            </div>
          )}
          {txSignature && (
            <a 
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View transaction →
            </a>
          )}
        </div>
      )}

      {/* Image */}
      <div>
        <label className="block text-sm font-medium mb-2">Token image</label>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--text-muted)] cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* Name & Symbol */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Token"
            maxLength={32}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Symbol</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            placeholder="TKN"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-mono uppercase"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="About your token..."
          rows={2}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none"
        />
      </div>

      {/* Private Key */}
      <div className="pt-4 border-t border-[var(--border)]">
        <label className="block text-sm font-medium mb-2">
          Private key <span className="text-[var(--accent)]">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Of wallet: {publicKey?.toBase58().slice(0, 8)}...
        </p>
        <input
          type="password"
          value={formData.privateKey}
          onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
          placeholder="Paste your private key"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-mono"
        />
      </div>

      {/* Initial Buy */}
      <div>
        <label className="block text-sm font-medium mb-2">Initial buy (SOL)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.initialBuy}
          onChange={(e) => setFormData({ ...formData, initialBuy: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-mono"
        />
      </div>

      {/* Socials */}
      <div className="pt-4 border-t border-[var(--border)]">
        <label className="block text-sm font-medium mb-3">Socials (optional)</label>
        <div className="space-y-3">
          <input
            type="text"
            value={formData.twitter}
            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
            placeholder="Twitter URL"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
          <input
            type="text"
            value={formData.telegram}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
            placeholder="Telegram URL"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
          <input
            type="text"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="Website URL"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
        </div>
      </div>

      {/* Status */}
      {isLoading && status && !success && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
          <div className="w-5 h-5 border-2 border-[var(--text)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{status}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !formData.name || !formData.symbol || !image || !formData.privateKey}
        className="w-full py-4 bg-[var(--bg-dark)] text-white rounded-xl text-base font-medium disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] hover:bg-[var(--text)] transition-colors disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating..." : "Launch token — ~0.1 SOL"}
      </button>
    </form>
  );
}
