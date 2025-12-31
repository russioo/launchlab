"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const copyWallet = () => {
    if (user?.wallet?.publicKey) {
      navigator.clipboard.writeText(user.wallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--black)] flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--black)] relative">
      <div className="grid-lines">
        {[...Array(5)].map((_, i) => <div key={i} className="grid-line" />)}
      </div>
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container max-w-2xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <p className="caption mb-4">Profile</p>
            <h1 className="mega text-3xl md:text-5xl">
              YOUR<br /><span className="text-[var(--gray-600)]">ACCOUNT</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            {/* Avatar & Username */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--gray-800)]">
              <div className="w-16 h-16 rounded-full bg-[var(--gray-800)] flex items-center justify-center text-2xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-medium">{user.username}</h2>
                <p className="text-[var(--gray-500)]">{user.email}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div>
                <label className="caption block mb-1">Email</label>
                <p>{user.email}</p>
              </div>

              <div>
                <label className="caption block mb-1">Username</label>
                <p>@{user.username}</p>
              </div>

              <div>
                <label className="caption block mb-1">Member Since</label>
                <p>{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>

              <hr className="border-[var(--gray-800)]" />

              {/* Wallet */}
              <div>
                <label className="caption block mb-2">Wallet Address</label>
                <div className="flex items-center gap-2 p-3 bg-[var(--black)] rounded-lg border border-[var(--gray-800)]">
                  <code className="flex-1 text-sm break-all text-[var(--gray-400)]">
                    {user.wallet?.publicKey || "No wallet"}
                  </code>
                  <button
                    onClick={copyWallet}
                    className="btn btn-ghost text-xs px-2 py-1"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-[var(--gray-600)] mt-2">
                  Fund this wallet with SOL to deploy tokens.
                </p>
              </div>

              <hr className="border-[var(--gray-800)]" />

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link href="/dashboard" className="btn btn-outline w-full">
                  Go to Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn w-full border border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
