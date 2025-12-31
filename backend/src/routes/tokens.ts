import { Router, Request, Response } from "express";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import multer from "multer";
import { supabase } from "../index.js";
import { getTokenInfo, createToken as pumpfunCreateToken, uploadMetadata as pumpfunUploadMetadata } from "../services/pumpfun.js";
import * as bagsService from "../services/bags.js";
import * as bonkService from "../services/bonk.js";
import { createTokenWithOfficialSdk } from "../services/tokenCreatorSdk.js";

export const tokenRoutes = Router();

// Multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

/**
 * GET /api/tokens - Get all tokens
 */
tokenRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { status, creator, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("tokens")
      .select(`
        id,
        mint,
        name,
        symbol,
        description,
        image_url,
        creator_wallet,
        status,
        total_fees_claimed,
        total_buyback,
        total_lp_added,
        total_burned,
        created_at,
        graduated_at,
        last_feed_at
      `)
      // Only show tokens that have been successfully launched (not pending)
      .neq("status", "pending")
      .neq("status", "failed")
      .not("mint", "is", null)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (creator) {
      query = query.eq("creator_wallet", creator);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }

    res.json({
      tokens: data || [],
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/user/:userId - Get tokens for a specific user
 * NOTE: Must be before /:id route to not be captured
 */
tokenRoutes.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // First get user's wallet
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("wallet_public_key")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get tokens created by this user's wallet
    const { data: tokens, error } = await supabase
      .from("tokens")
      .select(`
        id,
        mint,
        name,
        symbol,
        platform,
        status,
        image_url,
        total_fees_claimed,
        total_buyback,
        total_burned,
        total_lp_added,
        feature_buyback_enabled,
        feature_buyback_percent,
        feature_autoliq_enabled,
        feature_autoliq_percent,
        feature_revshare_enabled,
        feature_revshare_percent,
        feature_jackpot_enabled,
        feature_jackpot_percent,
        created_at
      `)
      .eq("creator_wallet", user.wallet_public_key)
      .neq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user tokens:", error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }

    res.json({ tokens: tokens || [] });
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/stats/global - Get global stats
 * NOTE: Must be before /:id route to not be captured
 */
tokenRoutes.get("/stats/global", async (req: Request, res: Response) => {
  try {
    // Count tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("tokens")
      .select("status")
      .neq("status", "pending")
      .neq("status", "failed")
      .not("mint", "is", null);

    if (tokensError) {
      return res.status(500).json({ error: "Failed to fetch stats" });
    }

    // Get actual stats from feed_history (source of truth)
    const { data: history, error: historyError } = await supabase
      .from("feed_history")
      .select("type, sol_amount");

    if (historyError) {
      console.error("Error fetching feed_history:", historyError);
    }

    // Calculate totals from feed_history
    let totalFeesClaimed = 0;
    let totalBuyback = 0;
    let totalLpAdded = 0;

    if (history) {
      for (const h of history) {
        const amount = Number(h.sol_amount) || 0;
        if (h.type === "claim_fees") {
          totalFeesClaimed += amount;
        } else if (h.type === "buyback" || h.type === "platform_buyback") {
          totalBuyback += amount;
        } else if (h.type === "add_liquidity") {
          totalLpAdded += amount;
        } else if (h.type === "fee_transfer") {
          // Wallet uses 50% for buyback, 50% for LP
          totalBuyback += amount * 0.5;
          totalLpAdded += amount * 0.5;
        }
      }
    }

    const stats = {
      totalTokens: tokens?.length || 0,
      liveTokens: tokens?.filter((t) => t.status === "live").length || 0,
      totalFeesClaimed,
      totalBuyback,
      totalLpAdded,
    };

    console.log("Global stats:", stats);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/activity/recent - Get recent activity across all tokens
 * NOTE: Must be before /:id route to not be captured
 */
tokenRoutes.get("/activity/recent", async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent feed history with token info
    // Filter out fee_transfer (internal transfers not shown publicly)
    const { data, error } = await supabase
      .from("feed_history")
      .select(`
        id,
        type,
        signature,
        sol_amount,
        token_amount,
        created_at,
        tokens:token_id (
          id,
          name,
          symbol,
          image_url,
          mint
        )
      `)
      .neq("type", "fee_transfer")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) {
      console.error("Error fetching activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }

    // Transform data for frontend
    const activity = (data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      signature: item.signature,
      solAmount: Number(item.sol_amount) || 0,
      tokenAmount: Number(item.token_amount) || 0,
      createdAt: item.created_at,
      token: item.tokens ? {
        id: item.tokens.id,
        name: item.tokens.name,
        symbol: item.tokens.symbol,
        imageUrl: item.tokens.image_url,
        mint: item.tokens.mint,
      } : null,
    }));

    res.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/:id - Get single token by ID or mint address
 */
tokenRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if it's a UUID or mint address
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let query = supabase
      .from("tokens")
      .select(`
        id,
        mint,
        name,
        symbol,
        description,
        image_url,
        creator_wallet,
        status,
        platform,
        pumpfun_bonding_curve,
        total_fees_claimed,
        total_buyback,
        total_lp_added,
        total_burned,
        created_at,
        graduated_at,
        last_feed_at,
        feature_buyback_enabled,
        feature_buyback_percent,
        feature_autoliq_enabled,
        feature_autoliq_percent,
        feature_revshare_enabled,
        feature_revshare_percent,
        feature_jackpot_enabled,
        feature_jackpot_percent,
        feed_history (
          id,
          type,
          signature,
          sol_amount,
          token_amount,
          created_at
        )
      `);
    
    if (isUUID) {
      query = query.eq("id", id);
    } else {
      // Assume it's a mint address
      query = query.eq("mint", id);
    }
    
    const { data, error } = await query.single();

    if (error || !data) {
      console.log(`Token not found: ${id} (isUUID: ${isUUID})`, error);
      return res.status(404).json({ error: "Token not found" });
    }

    // Filter out internal transfers from feed_history
    if (data.feed_history) {
      data.feed_history = data.feed_history.filter(
        (h: { type: string }) => h.type !== "fee_transfer"
      );
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/mint/:mint - Get token by mint address
 */
tokenRoutes.get("/mint/:mint", async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;

    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("mint", mint)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Token not found" });
    }

    const { bot_wallet_private, ...tokenData } = data;
    res.json(tokenData);
  } catch (error) {
    console.error("Error fetching token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/tokens/import - Import an existing Pumpfun token
 */
tokenRoutes.post("/import", async (req: Request, res: Response) => {
  try {
    const { mint, creatorWallet, devPrivateKey } = req.body;

    if (!mint || !creatorWallet) {
      return res.status(400).json({ error: "Missing mint or creatorWallet" });
    }

    if (!devPrivateKey) {
      return res.status(400).json({ error: "Private key is required for automation" });
    }

    console.log(`[API] Importing token: ${mint}`);

    // Validate private key
    let lpWallet: Keypair;
    try {
      lpWallet = Keypair.fromSecretKey(bs58.decode(devPrivateKey));
      console.log(`[API] Using dev wallet: ${lpWallet.publicKey.toBase58()}`);
      
      // Verify that the private key matches the connected wallet
      if (lpWallet.publicKey.toBase58() !== creatorWallet) {
        console.error(`[API] Private key mismatch! Expected ${creatorWallet}, got ${lpWallet.publicKey.toBase58()}`);
        return res.status(400).json({ 
          error: "Private key does not match connected wallet. Make sure you paste the private key from your currently connected wallet." 
        });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid private key format" });
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from("tokens")
      .select("id")
      .eq("mint", mint)
      .single();

    if (existing) {
      return res.status(400).json({ error: "Token already imported" });
    }

    // Fetch token info from Pumpfun
    const pumpfunInfo = await getTokenInfo(mint);
    
    if (!pumpfunInfo) {
      return res.status(404).json({ error: "Token not found on Pumpfun. Make sure the mint address is correct." });
    }

    console.log(`[API] Found token: ${pumpfunInfo.name} (${pumpfunInfo.symbol})`);

    // Determine status
    const status = pumpfunInfo.complete ? "graduating" : "bonding";

    // Insert into database with user's wallet as the bot wallet
    const { data: tokenData, error: insertError } = await supabase
      .from("tokens")
      .insert({
        mint,
        name: pumpfunInfo.name,
        symbol: pumpfunInfo.symbol,
        description: pumpfunInfo.description || "",
        image_url: pumpfunInfo.image_uri || null,
        creator_wallet: creatorWallet,
        bot_wallet_public: lpWallet.publicKey.toBase58(),
        bot_wallet_private: bs58.encode(lpWallet.secretKey),
        status,
        pumpfun_bonding_curve: pumpfunInfo.bonding_curve,
        pumpfun_associated_bonding_curve: pumpfunInfo.associated_bonding_curve,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return res.status(500).json({ error: "Failed to import token" });
    }

    console.log(`[API] Token imported successfully: ${tokenData.id}`);

    res.json({
      success: true,
      tokenId: tokenData.id,
      mint: tokenData.mint,
      name: pumpfunInfo.name,
      symbol: pumpfunInfo.symbol,
      imageUrl: pumpfunInfo.image_uri,
      status,
      lpWallet: lpWallet.publicKey.toBase58(),
    });
  } catch (error: any) {
    console.error("Error importing token:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/tokens/deploy - Deploy a new token (supports all platforms)
 * Uses multipart form data for image upload
 */
tokenRoutes.post("/deploy", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { userId, platform, name, symbol, description, initialBuy, features } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!userId || !platform || !name || !symbol) {
      return res.status(400).json({ 
        error: "Missing required fields: userId, platform, name, symbol" 
      });
    }

    console.log(`[Deploy] Creating ${platform} token: ${name} (${symbol})`);
    console.log(`[Deploy] User: ${userId}`);
    console.log(`[Deploy] Image: ${imageFile ? `${imageFile.size} bytes` : 'none'}`);

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_public_key, wallet_private_key")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("[Deploy] User not found:", userError);
      return res.status(404).json({ error: "User not found. Please login again." });
    }

    // Load user's wallet for automation
    let creatorWallet: Keypair;
    try {
      creatorWallet = Keypair.fromSecretKey(bs58.decode(user.wallet_private_key));
      console.log(`[Deploy] Using wallet: ${creatorWallet.publicKey.toBase58()}`);
    } catch (e) {
      return res.status(500).json({ error: "Invalid wallet configuration" });
    }

    // Check wallet balance
    const balance = await connection.getBalance(creatorWallet.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;
    console.log(`[Deploy] Wallet balance: ${balanceSol.toFixed(4)} SOL`);

    if (balanceSol < 0.05) {
      return res.status(400).json({ 
        error: `Insufficient balance. Your wallet has ${balanceSol.toFixed(4)} SOL. Minimum 0.05 SOL required. Fund your wallet at: ${creatorWallet.publicKey.toBase58()}`
      });
    }

    // Parse features
    let parsedFeatures: Array<{ id: string; percent: number }> = [];
    try {
      parsedFeatures = features ? JSON.parse(features) : [];
    } catch (e) {
      console.warn("[Deploy] Could not parse features:", features);
    }

    // Build feature flags for database
    const featureFlags = {
      feature_buyback_enabled: parsedFeatures.some(f => f.id === "buyback_burn"),
      feature_buyback_percent: parsedFeatures.find(f => f.id === "buyback_burn")?.percent || 0,
      feature_autoliq_enabled: parsedFeatures.some(f => f.id === "auto_liquidity"),
      feature_autoliq_percent: parsedFeatures.find(f => f.id === "auto_liquidity")?.percent || 0,
      feature_revshare_enabled: parsedFeatures.some(f => f.id === "revenue_share"),
      feature_revshare_percent: parsedFeatures.find(f => f.id === "revenue_share")?.percent || 0,
      feature_jackpot_enabled: parsedFeatures.some(f => f.id === "jackpot"),
      feature_jackpot_percent: parsedFeatures.find(f => f.id === "jackpot")?.percent || 0,
    };

    console.log("[Deploy] Features:", featureFlags);

    let result: any;
    const initialBuySol = parseFloat(initialBuy) || 0.01;

    // Create token based on platform
    if (platform === "pumpfun") {
      console.log("[Deploy] Creating Pump.fun token...");
      
      // First upload metadata to IPFS
      let metadataUri = "";
      let imageUrl = "";
      
      if (imageFile?.buffer) {
        console.log("[Deploy] Uploading metadata to IPFS...");
        const uploadResult = await pumpfunUploadMetadata(
          imageFile.buffer,
          { name, symbol, description: description || "" }
        );
        if ('metadataUri' in uploadResult) {
          metadataUri = uploadResult.metadataUri;
          imageUrl = uploadResult.imageUri || "";
          console.log("[Deploy] Metadata uploaded:", metadataUri);
        } else if ('error' in uploadResult) {
          console.error("[Deploy] Metadata upload failed:", uploadResult.error);
          return res.status(500).json({ error: `Metadata upload failed: ${uploadResult.error}` });
        }
      }
      
      // Create token on Pumpfun
      result = await pumpfunCreateToken(
        connection,
        creatorWallet,
        creatorWallet, // Use same wallet for LP
        metadataUri,
        { name, symbol, description: description || "" },
        initialBuySol
      );
      
      // Add image URL to result
      if (result.success && imageUrl) {
        result.imageUrl = imageUrl;
      }
    } else if (platform === "bags") {
      console.log("[Deploy] Creating Bags.fm token...");
      result = await bagsService.createToken(
        connection,
        creatorWallet,
        { name, symbol, description: description || "" },
        imageFile?.buffer || Buffer.from([]),
        initialBuySol
      );
    } else if (platform === "bonk") {
      console.log("[Deploy] Creating Bonk.fun token...");
      // Bonk requires metadata URI - upload first
      let bonkMetadataUri = "";
      if (imageFile?.buffer) {
        const uploadResult = await pumpfunUploadMetadata(
          imageFile.buffer,
          { name, symbol, description: description || "" }
        );
        if ('metadataUri' in uploadResult) {
          bonkMetadataUri = uploadResult.metadataUri;
        }
      }
      result = await bonkService.createToken(
        connection,
        creatorWallet,
        { name, symbol, description: description || "" },
        bonkMetadataUri,
        initialBuySol
      );
    } else {
      return res.status(400).json({ error: `Platform "${platform}" not supported` });
    }

    if (!result.success) {
      console.error("[Deploy] Token creation failed:", result.error);
      return res.status(500).json({ error: result.error || "Token creation failed" });
    }

    console.log(`[Deploy] Token created! Mint: ${result.mint}`);

    // Store token in database
    const { data: tokenData, error: insertError } = await supabase
      .from("tokens")
      .insert({
        mint: result.mint,
        name,
        symbol,
        description: description || "",
        image_url: result.imageUrl || null,
        creator_wallet: user.wallet_public_key,
        bot_wallet_public: creatorWallet.publicKey.toBase58(),
        bot_wallet_private: user.wallet_private_key,
        status: "bonding",
        platform,
        pumpfun_bonding_curve: result.bondingCurve || result.poolAddress || null,
        pumpfun_associated_bonding_curve: result.associatedBondingCurve || null,
        ...featureFlags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Deploy] Database insert error:", insertError);
      // Token was created on-chain, return success with warning
      return res.json({
        success: true,
        mint: result.mint,
        tokenId: null,
        warning: "Token created but database record failed. Contact support.",
      });
    }

    console.log(`[Deploy] Token saved to database: ${tokenData.id}`);

    // Record creation in feed_history
    await supabase.from("feed_history").insert({
      token_id: tokenData.id,
      type: "create",
      signature: result.signature || "deploy",
      sol_amount: initialBuySol,
      token_amount: 0,
    });

    res.json({
      success: true,
      tokenId: tokenData.id,
      mint: result.mint,
      signature: result.signature,
    });
  } catch (error: any) {
    console.error("[Deploy] Error:", error);
    res.status(500).json({ error: error.message || "Token deployment failed" });
  }
});

/**
 * POST /api/tokens/create - Create a new token on Pumpfun
 */
tokenRoutes.post("/create", async (req: Request, res: Response) => {
  try {
    const {
      name,
      symbol,
      description,
      image, // base64 encoded image
      twitter,
      telegram,
      website,
      creatorWallet,
      devPrivateKey, // Optional: user's dev wallet private key for automation
      initialBuySol, // Optional: initial buy amount in SOL
    } = req.body;

    // Validate required fields
    if (!name || !symbol || !creatorWallet) {
      return res.status(400).json({ 
        error: "Missing required fields: name, symbol, creatorWallet" 
      });
    }

    console.log(`[API] Creating token: ${name} (${symbol})`);

    // Clean up old pending tokens from same creator to avoid duplicates
    const { data: pendingTokens } = await supabase
      .from("tokens")
      .select("id, created_at")
      .eq("creator_wallet", creatorWallet)
      .eq("status", "pending");

    if (pendingTokens && pendingTokens.length > 0) {
      // Delete pending tokens older than 5 minutes (failed launches)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const oldPending = pendingTokens.filter(t => t.created_at < fiveMinutesAgo);
      
      if (oldPending.length > 0) {
        console.log(`[API] Cleaning up ${oldPending.length} old pending token(s)...`);
        await supabase
          .from("tokens")
          .delete()
          .in("id", oldPending.map(t => t.id));
      }
    }

    // 1. Use provided dev wallet or generate new one
    let lpWallet: Keypair;
    if (devPrivateKey) {
      try {
        lpWallet = Keypair.fromSecretKey(bs58.decode(devPrivateKey));
        console.log(`[API] Using dev wallet: ${lpWallet.publicKey.toBase58()}`);
        
        // Verify that the private key matches the connected wallet
        if (lpWallet.publicKey.toBase58() !== creatorWallet) {
          console.error(`[API] Private key mismatch! Expected ${creatorWallet}, got ${lpWallet.publicKey.toBase58()}`);
          return res.status(400).json({ 
            error: "Private key does not match connected wallet. Make sure you paste the private key from your currently connected wallet." 
          });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid private key format" });
      }
    } else {
      return res.status(400).json({ 
        error: "Private key required. Paste the private key of your connected wallet." 
      });
    }

    // 2. Upload image to Supabase Storage + metadata to IPFS
    let metadataUri = "";
    let imageUrl = "";
    
    if (image) {
      // Extract base64 from data URL
      let imageBase64 = image;
      let mimeType = "image/png";
      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBase64 = matches[2];
        } else {
          imageBase64 = image.split(",")[1];
        }
      }
      
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const fileExt = mimeType.split("/")[1] || "png";
      const fileName = `${symbol.toLowerCase()}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      console.log(`[API] Uploading image to Supabase Storage...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("token-images")
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      
      if (uploadError) {
        console.warn(`[API] Supabase Storage upload failed:`, uploadError.message);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from("token-images")
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
        console.log(`[API] Image uploaded to Supabase: ${imageUrl}`);
      }
      
      // Also upload to pump.fun IPFS for token creation
      console.log(`[API] Uploading metadata to IPFS...`);
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], { type: mimeType }), "token.png");
      formData.append("name", name);
      formData.append("symbol", symbol);
      formData.append("description", description || "");
      if (twitter) formData.append("twitter", twitter);
      if (telegram) formData.append("telegram", telegram);
      if (website) formData.append("website", website);
      formData.append("showName", "true");

      try {
        // Try pump.fun's IPFS endpoint
        const ipfsResponse = await fetch("https://pump.fun/api/ipfs", {
          method: "POST",
          body: formData,
        });

        if (ipfsResponse.ok) {
          const ipfsResult = await ipfsResponse.json() as any;
          console.log(`[API] IPFS Response:`, JSON.stringify(ipfsResult));
          
          metadataUri = ipfsResult.metadataUri;
          
          // If Supabase upload failed, try to use IPFS image
          if (!imageUrl && ipfsResult.metadata?.image) {
            imageUrl = ipfsResult.metadata.image;
            if (imageUrl.startsWith("ipfs://")) {
              imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`;
            }
          }
          
          console.log(`[API] Final image URL: ${imageUrl}`);
          console.log(`[API] Metadata URI: ${metadataUri}`);
        } else {
          // If pump.fun IPFS fails, try alternative or skip
          console.warn("[API] IPFS upload failed, will create token without metadata URI");
          // Create a placeholder metadata URI - token will still work
          metadataUri = `https://pump.fun/coin/${name.toLowerCase().replace(/\s/g, "-")}`;
        }
      } catch (ipfsError) {
        console.warn("[API] IPFS upload error, continuing without metadata:", ipfsError);
        metadataUri = `https://pump.fun/coin/${name.toLowerCase().replace(/\s/g, "-")}`;
      }
    }

    // 3. Get Pumpfun create transaction using official SDK
    const buyAmount = parseFloat(initialBuySol) || 0;
    console.log(`[API] Creating token with pump-fun SDK, initial buy: ${buyAmount} SOL...`);
    const txResult = await createTokenWithOfficialSdk({
      name,
      symbol,
      metadataUri,
      creatorWallet,
      initialBuySol: buyAmount,
    });

    if (!txResult.success || !txResult.transaction) {
      return res.status(500).json({ error: txResult.error || "Failed to get create transaction" });
    }

    // 4. Store token in database with "pending" status
    // Status changes to "bonding" after frontend confirms the transaction was sent
    const { data: tokenData, error: insertError } = await supabase
      .from("tokens")
      .insert({
        name,
        symbol,
        description: description || "",
        image_url: imageUrl || null,
        creator_wallet: creatorWallet, // This is the connected wallet public key
        bot_wallet_public: lpWallet.publicKey.toBase58(), // Dev wallet for automation
        bot_wallet_private: bs58.encode(lpWallet.secretKey), // Private key for signing txs
        status: "pending", // Waiting for frontend to sign and send transaction
        twitter: twitter || null,
        telegram: telegram || null,
        website: website || null,
        mint: txResult.mint,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return res.status(500).json({ error: "Failed to create token record" });
    }

    console.log(`[API] Token record created: ${tokenData.id}, mint: ${txResult.mint}`);

    // Return transaction for frontend to sign
    res.json({
      success: true,
      tokenId: tokenData.id,
      mint: txResult.mint,
      lpWallet: lpWallet.publicKey.toBase58(),
      transaction: txResult.transaction,
      mintSecretKey: txResult.mintSecretKey,
    });
  } catch (error: any) {
    console.error("Error creating token:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/tokens/:id/confirm - Confirm token creation after signing
 */
tokenRoutes.post("/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signature, bondingCurve, associatedBondingCurve } = req.body;

    if (!signature) {
      return res.status(400).json({ error: "Missing signature" });
    }

    // Verify the transaction on-chain
    const txInfo = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return res.status(400).json({ error: "Transaction not found on-chain" });
    }

    // Update token status
    const { error } = await supabase
      .from("tokens")
      .update({
        status: "bonding",
        pumpfun_bonding_curve: bondingCurve,
        pumpfun_associated_bonding_curve: associatedBondingCurve,
      })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Failed to update token" });
    }

    // Record in feed_history instead of separate transactions table
    await supabase.from("feed_history").insert({
      token_id: id,
      type: "create",
      signature,
      sol_amount: 0,
      token_amount: 0,
    });

    // Get updated token
    const { data: token } = await supabase
      .from("tokens")
      .select("mint")
      .eq("id", id)
      .single();

    res.json({ success: true, mint: token?.mint });
  } catch (error: any) {
    console.error("Error confirming token:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tokens/:id/feed - Manually trigger LP feed for a token
 * Note: Feed happens automatically via cron job every minute
 */
tokenRoutes.post("/:id/feed", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Feed happens automatically via cron, this endpoint is for manual trigger
    res.json({ 
      success: true, 
      message: "Feed runs automatically every minute via cron job",
      tokenId: id 
    });
  } catch (error: unknown) {
    console.error("Error triggering feed:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

/**
 * DELETE /api/tokens/cleanup - Clean up old pending tokens
 */
tokenRoutes.delete("/cleanup", async (req: Request, res: Response) => {
  try {
    // Delete tokens that are pending and older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: deleted, error } = await supabase
      .from("tokens")
      .delete()
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo)
      .select("id, name, symbol");

    if (error) {
      console.error("Cleanup error:", error);
      return res.status(500).json({ error: "Cleanup failed" });
    }

    console.log(`[API] Cleaned up ${deleted?.length || 0} pending token(s)`);
    
    res.json({
      success: true,
      deleted: deleted?.length || 0,
      tokens: deleted || [],
    });
  } catch (error) {
    console.error("Error in cleanup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Activity route moved to before /:id

/**
 * GET /api/tokens/:id/history - Get feed history for a token
 */
tokenRoutes.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("feed_history")
      .select("*")
      .eq("token_id", id)
      .neq("type", "fee_transfer")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(500).json({ error: "Failed to fetch history" });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
