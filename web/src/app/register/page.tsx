"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{ publicKey: string; privateKey: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await register(form.email, form.username, form.password);
    setLoading(false);

    if (result.success && result.wallet) {
      setWalletInfo(result.wallet);
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--black)] relative">
      <div className="grid-lines">
        {[...Array(5)].map((_, i) => <div key={i} className="grid-line" />)}
      </div>
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="caption mb-4">Get Started</p>
            <h1 className="mega text-4xl mb-4">
              CREATE<br /><span className="text-[var(--gray-600)]">ACCOUNT</span>
            </h1>
            <p className="body">Join Launchub and start launching tokens.</p>
          </motion.div>

          {walletInfo ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="title text-2xl mb-2">Account Created!</h2>
                <p className="body">Save your wallet info below</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-[var(--gray-900)] rounded-lg">
                  <label className="caption block mb-1">Public Key</label>
                  <code className="text-sm break-all">{walletInfo.publicKey}</code>
                </div>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <label className="caption block mb-1 text-yellow-500">Private Key (Save this!)</label>
                  <code className="text-sm break-all text-yellow-400">{walletInfo.privateKey}</code>
                  <p className="text-xs text-yellow-600 mt-2">Store securely. Will not be shown again!</p>
                </div>
              </div>

              <button onClick={() => router.push("/login")} className="btn btn-white w-full">
                Continue to Login
              </button>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
                    required
                    className="input"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-white w-full mt-6 disabled:opacity-50">
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <p className="text-center text-sm text-[var(--gray-500)] mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--white)] hover:underline">Sign in</Link>
              </p>
            </motion.form>
          )}
        </div>
      </main>
    </div>
  );
}
