"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await login(emailOrUsername, password);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Login failed");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--black)] relative">
      <div className="grid-lines">
        {[...Array(5)].map((_, i) => <div key={i} className="grid-line" />)}
      </div>
      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="caption mb-4">Welcome Back</p>
            <h1 className="mega text-4xl mb-4">SIGN IN</h1>
            <p className="body">Access your dashboard and manage tokens</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm mb-2">Email or Username</label>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-white w-full disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--gray-800)] text-center">
              <p className="text-sm text-[var(--gray-500)]">
                Don't have an account?{" "}
                <Link href="/register" className="text-[var(--white)] hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
