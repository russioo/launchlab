"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`py-3 px-5 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
        publicKey
          ? "bg-white/80 text-[var(--text)] border border-white/60 hover:bg-white shadow-sm backdrop-blur-sm"
          : "bg-gradient-to-r from-[var(--coral)] to-[var(--orange)] text-white shadow-lg shadow-[var(--coral)]/20 hover:shadow-xl hover:shadow-[var(--coral)]/30 hover:-translate-y-0.5"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          publicKey ? "bg-[var(--success)]" : "bg-white/50"
        }`}
      />
      {connecting
        ? "Connecting..."
        : publicKey
        ? formatAddress(publicKey.toBase58())
        : "Connect"}
    </button>
  );
}
