import { Router } from "express";
import { supabase } from "../index.js";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import crypto from "crypto";

export const authRoutes = Router();

// Simple password hashing (use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate a new Solana wallet
function generateWallet(): { publicKey: string; privateKey: string } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  };
}

// Register a new user
authRoutes.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .single();

    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Generate wallet for user
    const wallet = generateWallet();

    // Create user in database
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password_hash: hashPassword(password),
        wallet_public_key: wallet.publicKey,
        wallet_private_key: wallet.privateKey, // In production, encrypt this!
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }

    // Return user data (without password hash, with wallet info)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet: {
          publicKey: user.wallet_public_key,
          privateKey: user.wallet_private_key, // Only shown once at registration!
        },
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login user
authRoutes.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Email/username and password are required" });
    }

    // Find user by email or username
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${emailOrUsername.toLowerCase()},username.eq.${emailOrUsername.toLowerCase()}`)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check password
    if (user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Update last login
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    // Return user data (without password hash and private key for login)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet: {
          publicKey: user.wallet_public_key,
          // Don't return private key on login for security
        },
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID (for session validation)
authRoutes.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, username, wallet_public_key, created_at")
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      wallet: {
        publicKey: user.wallet_public_key,
      },
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user profile with private key (requires password verification)
authRoutes.post("/user/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password required to view private key" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password before showing private key
    if (user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      wallet: {
        publicKey: user.wallet_public_key,
        privateKey: user.wallet_private_key,
      },
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

