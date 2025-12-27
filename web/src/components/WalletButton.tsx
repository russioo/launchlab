"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useMemo } from "react";

export function WalletButton() {
  const { publicKey, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const truncatedAddress = useMemo(() => {
    if (!base58) return null;
    return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
  }, [base58]);

  const handleClick = useCallback(() => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  }, [publicKey, disconnect, setVisible]);

  if (connecting) {
    return (
      <button 
        className="px-4 py-2 text-sm font-medium text-[var(--ink-muted)] rounded-full flex items-center gap-2" 
        disabled
      >
        <div className="w-3 h-3 border-2 border-[var(--ink-faded)] border-t-[var(--accent)] rounded-full animate-spin" />
        <span>Connecting</span>
      </button>
    );
  }

  if (publicKey && truncatedAddress) {
    return (
      <div className="flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-soft)]">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-[var(--ink)]">
            {truncatedAddress}
          </span>
        </div>
        <button 
          onClick={handleClick} 
          className="px-4 py-2 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-full transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleClick} 
      className="px-5 py-2 text-sm font-medium bg-[var(--ink)] text-[var(--bg-cream)] rounded-full hover:bg-[var(--accent)] transition-colors"
    >
      Connect
    </button>
  );
}
