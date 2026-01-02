import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://liquidity-snowy.vercel.app",
  "https://liquidify.fun",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" })); // Increased for image uploads

// Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("⚠️  Warning: Supabase credentials not set. Database features will not work.");
}

export const supabase = createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || "placeholder"
);

// Import routes synchronously
import { tokenRoutes } from "./routes/tokens.js";
import { authRoutes } from "./routes/auth.js";

app.use("/api/tokens", tokenRoutes);
app.use("/api/auth", authRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ 
    name: "LAUNCHLAB API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      tokens: "/api/tokens",
      stats: "/api/tokens/stats",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        user: "GET /api/auth/user/:id",
      }
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    supabase: !!process.env.SUPABASE_URL,
    rpc: !!process.env.HELIUS_RPC_URL || !!process.env.SOLANA_RPC_URL,
  });
});

// LAUNCHLAB TOKEN - FIRST PRIORITY - every 1 minute
const LAUNCHLAB_MINT = "HsQMA4YGN7J9snvnSqEGbuJCKPvr3tQCWRG2h3ty7H19";
cron.schedule("* * * * *", async () => {
  console.log("⚡ [LAUNCHLAB] Priority cycle starting...");
  try {
    const { processLAUNCHLABToken } = await import("./services/liquidityFeeder.js");
    await processLAUNCHLABToken(LAUNCHLAB_MINT);
    console.log("✅ [LAUNCHLAB] Priority cycle complete");
  } catch (error) {
    console.error("❌ [LAUNCHLAB] Error in priority cycle:", error);
  }
});

// Cron job - every 2 minutes: claim fees + buyback + liquidity for OTHER tokens
// (Increased from 1 minute to handle more tokens and avoid rate limits)
cron.schedule("*/2 * * * *", async () => {
  console.log("🔄 [CRON] Starting feed cycle for other tokens...");
  try {
    const { processAllTokens } = await import("./services/liquidityFeeder.js");
    await processAllTokens(LAUNCHLAB_MINT); // Pass LAUNCHLAB mint to exclude it
    console.log("✅ [CRON] Feed cycle complete");
  } catch (error) {
    console.error("❌ [CRON] Error in feed cycle:", error);
  }
});

// Cron job - every 10 minutes: clean up old pending tokens
cron.schedule("*/10 * * * *", async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: deleted, error } = await supabase
      .from("tokens")
      .delete()
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo)
      .select("id");

    if (!error && deleted && deleted.length > 0) {
      console.log(`🧹 [CRON] Cleaned up ${deleted.length} old pending token(s)`);
    }
  } catch (error) {
    console.error("❌ [CRON] Error in cleanup:", error);
  }
});

// Run LAUNCHLAB first, then others on startup
setTimeout(async () => {
  console.log("🚀 [STARTUP] Running initial LAUNCHLAB priority cycle...");
  try {
    const { processLAUNCHLABToken, processAllTokens } = await import("./services/liquidityFeeder.js");
    await processLAUNCHLABToken(LAUNCHLAB_MINT);
    console.log("✅ [STARTUP] LAUNCHLAB priority cycle complete");
    
    console.log("🚀 [STARTUP] Running initial feed cycle for other tokens...");
    await processAllTokens(LAUNCHLAB_MINT);
    console.log("✅ [STARTUP] Initial feed cycle complete");
  } catch (error) {
    console.error("❌ [STARTUP] Error:", error);
  }
}, 10000);

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                     LAUNCHLAB BACKEND                     ║
╠═══════════════════════════════════════════════════════╣
║  Server:    http://0.0.0.0:${PORT}                        ║
║  Health:    /health                                    ║
║  API:       /api/tokens                                ║
╠═══════════════════════════════════════════════════════╣
║  ⚡ LAUNCHLAB: Every 1 min (FIRST PRIORITY)               ║
║  🔄 Others: Every 2 min                                ║
╚═══════════════════════════════════════════════════════╝
  `);
});
