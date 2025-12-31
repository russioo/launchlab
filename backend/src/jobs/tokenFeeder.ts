/**
 * Token Feeder Job
 * Runs every 5 minutes to process active tokens:
 * 1. Claim fees
 * 2. Distribute based on feature settings (buyback & burn, revshare, jackpot)
 * 
 * Based on Bags.fm docs:
 * - Claim fees: https://docs.bags.fm/how-to-guides/claim-fees
 * - Trade: https://docs.bags.fm/how-to-guides/trade-tokens
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { supabase } from "../index.js";
import * as bagsService from "../services/bags.js";
import * as pumpfunService from "../services/pumpfun.js";
import * as bonkService from "../services/bonk.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Minimum SOL to process (avoid dust transactions)
const MIN_FEES_SOL = 0.0001;

// Default interval: 30 seconds
const DEFAULT_INTERVAL_MS = 30 * 1000;

interface TokenJob {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  platform: string;
  bot_wallet_public: string;
  bot_wallet_private: string;
  pumpfun_bonding_curve?: string;
  feature_buyback_enabled: boolean;
  feature_buyback_percent: number;
  feature_autoliq_enabled: boolean;
  feature_autoliq_percent: number;
  feature_revshare_enabled: boolean;
  feature_revshare_percent: number;
  feature_jackpot_enabled: boolean;
  feature_jackpot_percent: number;
  feature_jackpot_min_hold: number;
  feature_keep_percent: number;
  job_interval_seconds: number;
  job_last_run: string | null;
  total_fees_claimed?: number;
  total_buyback?: number;
  total_burned?: number;
  total_lp_added?: number;
  total_revshare_paid?: number;
  total_jackpot_paid?: number;
}

let isRunning = false;
let jobInterval: NodeJS.Timeout | null = null;

/**
 * Start the job scheduler
 */
export function startTokenFeeder() {
  if (jobInterval) {
    console.log("[Feeder] Already running");
    return;
  }

  console.log("[Feeder] Starting token feeder job (30 sec interval)...");
  
  // Run immediately on start
  runFeederCycle();
  
  // Then run every 5 minutes
  jobInterval = setInterval(runFeederCycle, DEFAULT_INTERVAL_MS);
}

/**
 * Stop the job scheduler
 */
export function stopTokenFeeder() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log("[Feeder] Stopped token feeder job");
  }
}

/**
 * Run one cycle of the feeder
 */
async function runFeederCycle() {
  if (isRunning) {
    console.log("[Feeder] Skipping - previous cycle still running");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  
  try {
    // Get all tokens that need processing
    const { data: tokens, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("job_paused", false)
      .in("status", ["bonding", "live"]);

    if (error) {
      console.error("[Feeder] Error fetching tokens:", error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log("[Feeder] No active tokens to process");
      return;
    }

    console.log(`[Feeder] Processing ${tokens.length} tokens...`);

    for (const token of tokens as TokenJob[]) {
      // Check if enough time has passed since last run
      if (token.job_last_run) {
        const lastRun = new Date(token.job_last_run);
        const intervalMs = (token.job_interval_seconds || 30) * 1000;
        if (Date.now() - lastRun.getTime() < intervalMs) {
          continue;
        }
      }

      await processToken(token);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Feeder] Cycle completed in ${elapsed}ms`);
  } catch (error) {
    console.error("[Feeder] Cycle error:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Process a single token
 */
async function processToken(token: TokenJob) {
  console.log(`\n[Feeder] ════════════════════════════════════════`);
  console.log(`[Feeder] Processing ${token.symbol} (${token.platform})`);
  console.log(`[Feeder] ════════════════════════════════════════`);

  try {
    // Get keypair from token's bot wallet
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58.decode(token.bot_wallet_private));
    } catch (e) {
      console.error(`[Feeder] Invalid keypair for ${token.symbol}`);
      return;
    }

    // Step 1: Claim fees
    console.log(`[Feeder] Step 1: Claiming fees...`);
    const claimResult = await claimFees(token, keypair);
    
    if (!claimResult.success) {
      console.log(`[Feeder] Claim failed: ${claimResult.error}`);
      await updateTokenLastRun(token.id);
      return;
    }

    // Check for status messages (e.g., "waiting for migration" on Bonk)
    if ((claimResult as any).message) {
      console.log(`[Feeder] ⏳ ${(claimResult as any).message}`);
      await updateTokenLastRun(token.id);
      return;
    }

    if (!claimResult.amount || claimResult.amount < MIN_FEES_SOL) {
      console.log(`[Feeder] No fees to claim (${claimResult.amount || 0} SOL)`);
      await updateTokenLastRun(token.id);
      return;
    }

    console.log(`[Feeder] ✅ Claimed ${claimResult.amount} SOL`);

    // Log claim
    await logFeedHistory(token.id, "claim_fees", claimResult.signature || "", claimResult.amount);

    // Step 2: Distribute fees based on feature settings
    await distributeFees(token, keypair, claimResult.amount);

    // Update token stats and last run
    await supabase
      .from("tokens")
      .update({
        job_last_run: new Date().toISOString(),
        last_feed_at: new Date().toISOString(),
        total_fees_claimed: (token.total_fees_claimed || 0) + claimResult.amount,
      })
      .eq("id", token.id);

    console.log(`[Feeder] ✅ Token ${token.symbol} processing complete`);

  } catch (error) {
    console.error(`[Feeder] Error processing ${token.symbol}:`, error);
    await updateTokenLastRun(token.id);
  }
}

/**
 * Update token last run time
 */
async function updateTokenLastRun(tokenId: string) {
  await supabase
    .from("tokens")
    .update({ job_last_run: new Date().toISOString() })
    .eq("id", tokenId);
}

/**
 * Claim fees for a token
 */
async function claimFees(token: TokenJob, keypair: Keypair): Promise<{ success: boolean; amount: number; signature?: string; error?: string }> {
  switch (token.platform) {
    case "bags":
      return bagsService.claimCreatorFees(connection, keypair, token.mint);
    case "pumpfun":
      return pumpfunService.claimCreatorFees(connection, keypair, token.mint);
    case "bonk":
      // Use pool address from DB if available, otherwise use mint
      const poolOrMint = token.pumpfun_bonding_curve || token.mint;
      return bonkService.claimCreatorFees(connection, keypair, poolOrMint);
    default:
      return { success: false, amount: 0, error: `Unknown platform: ${token.platform}` };
  }
}

/**
 * Distribute fees based on feature settings
 */
async function distributeFees(token: TokenJob, keypair: Keypair, totalSol: number) {
  console.log(`\n[Feeder] Step 2: Distributing ${totalSol} SOL...`);

  // Calculate amounts for each feature
  const buybackAmount = token.feature_buyback_enabled ? (totalSol * token.feature_buyback_percent / 100) : 0;
  const autoliqAmount = token.feature_autoliq_enabled ? (totalSol * token.feature_autoliq_percent / 100) : 0;
  const revshareAmount = token.feature_revshare_enabled ? (totalSol * token.feature_revshare_percent / 100) : 0;
  const jackpotAmount = token.feature_jackpot_enabled ? (totalSol * token.feature_jackpot_percent / 100) : 0;

  console.log(`[Feeder] Allocation:`);
  console.log(`  - Buyback & Burn: ${buybackAmount.toFixed(4)} SOL (${token.feature_buyback_percent}%)`);
  console.log(`  - Auto Liquidity: ${autoliqAmount.toFixed(4)} SOL (${token.feature_autoliq_percent}%)`);
  console.log(`  - Revenue Share: ${revshareAmount.toFixed(4)} SOL (${token.feature_revshare_percent}%)`);
  console.log(`  - Jackpot: ${jackpotAmount.toFixed(4)} SOL (${token.feature_jackpot_percent}%)`);

  // Execute features in order

  // 1. Buyback & Burn (available on all platforms)
  if (buybackAmount >= MIN_FEES_SOL && token.feature_buyback_enabled) {
    console.log(`\n[Feeder] 🔥 Executing Buyback & Burn...`);
    await executeBuybackAndBurn(token, keypair, buybackAmount);
  }

  // 2. Auto Liquidity (NOT available on Bags)
  if (autoliqAmount >= MIN_FEES_SOL && token.feature_autoliq_enabled && token.platform !== "bags") {
    console.log(`\n[Feeder] 💧 Executing Auto Liquidity...`);
    await executeAutoLiquidity(token, keypair, autoliqAmount);
  }

  // 3. Revenue Share (distribute to all holders)
  if (revshareAmount >= MIN_FEES_SOL && token.feature_revshare_enabled) {
    console.log(`\n[Feeder] 💰 Executing Revenue Share...`);
    await executeRevenueShare(token, keypair, revshareAmount);
  }

  // 4. Jackpot (random holder gets it all)
  if (jackpotAmount >= MIN_FEES_SOL && token.feature_jackpot_enabled) {
    console.log(`\n[Feeder] 🎰 Executing Jackpot...`);
    await executeJackpot(token, keypair, jackpotAmount);
  }
}

/**
 * Execute buyback and burn
 * 1. Buy tokens with SOL using trade API
 * 2. Burn the purchased tokens
 */
async function executeBuybackAndBurn(token: TokenJob, keypair: Keypair, solAmount: number) {
  try {
    let result: { success: boolean; tokensBurned?: number; signature?: string; error?: string };

    if (token.platform === "bags") {
      // Use Bags SDK buyback and burn
      result = await bagsService.buybackAndBurn(connection, keypair, token.mint, solAmount);
    } else {
      // For other platforms, buy then burn manually
      const buyResult = await buyTokens(token, keypair, solAmount);
      if (!buyResult.success) {
        console.error(`[Feeder] Buyback failed: ${buyResult.error}`);
        return;
      }

      console.log(`[Feeder] Buy successful: ${buyResult.signature}`);
      console.log(`[Feeder] Waiting for token account...`);

      // Verify buy transaction was successful
      if (buyResult.signature) {
        try {
          const txInfo = await connection.getTransaction(buyResult.signature, { 
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0 
          });
          if (txInfo?.meta?.err) {
            console.error(`[Feeder] Buy transaction failed on-chain:`, txInfo.meta.err);
            result = { success: false, error: "Buy transaction failed on-chain" };
            return;
          }
          console.log(`[Feeder] Buy transaction confirmed on-chain`);
        } catch (e) {
          console.log(`[Feeder] Could not verify transaction, continuing...`);
        }
      }

      // Wait for token account update with retry
      let tokenBalanceRaw = 0;
      let tokenBalanceHuman = 0;
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds between checks
        
        tokenBalanceRaw = await bagsService.getTokenBalance(connection, keypair.publicKey, token.mint, false);
        tokenBalanceHuman = await bagsService.getTokenBalance(connection, keypair.publicKey, token.mint, true);
        
        console.log(`[Feeder] Token balance check ${attempt}/5: ${tokenBalanceHuman} tokens (raw: ${tokenBalanceRaw})`);
        
        if (tokenBalanceRaw > 0) break;
      }
      
      if (tokenBalanceRaw > 0) {
        console.log(`[Feeder] Burning ${tokenBalanceHuman} tokens...`);
        const burnResult = await bagsService.burnTokens(connection, keypair, token.mint, tokenBalanceRaw);
        result = {
          success: burnResult.success,
          tokensBurned: tokenBalanceHuman, // Store human-readable amount
          signature: burnResult.signature,
          error: burnResult.error,
        };
      } else {
        result = { success: false, error: "No tokens found after purchase - token account may not exist yet" };
      }
    }

    if (result.success) {
      console.log(`[Feeder] ✅ Buyback & Burn complete: ${result.tokensBurned} tokens burned`);
      
      await logFeedHistory(token.id, "buyback", result.signature || "", solAmount, result.tokensBurned);
      
      await supabase
        .from("tokens")
        .update({
          total_buyback: (token.total_buyback || 0) + solAmount,
          total_burned: (token.total_burned || 0) + (result.tokensBurned || 0),
        })
        .eq("id", token.id);
    } else {
      console.error(`[Feeder] ❌ Buyback & Burn failed: ${result.error}`);
    }
  } catch (error: any) {
    console.error(`[Feeder] Buyback error:`, error.message);
  }
}

/**
 * Buy tokens using platform-specific method
 */
async function buyTokens(token: TokenJob, keypair: Keypair, solAmount: number): Promise<{ success: boolean; tokenAmount?: number; signature?: string; error?: string }> {
  switch (token.platform) {
    case "bags":
      return bagsService.buyTokens(connection, keypair, token.mint, solAmount);
    case "pumpfun":
      return pumpfunService.buyTokens(connection, keypair, token.mint, solAmount);
    case "bonk":
      return bonkService.buyTokens(connection, keypair, token.mint, solAmount);
    default:
      return { success: false, error: "Unknown platform" };
  }
}

/**
 * Execute auto liquidity (add to LP)
 * NOT available on Bags
 */
async function executeAutoLiquidity(token: TokenJob, keypair: Keypair, solAmount: number) {
  try {
    let result;
    
    switch (token.platform) {
      case "pumpfun":
        result = await pumpfunService.addLiquidity(connection, keypair, token.mint, solAmount);
        break;
      case "bonk":
        result = await bonkService.addLiquidity(connection, keypair, token.mint, solAmount);
        break;
      default:
        console.log(`[Feeder] Auto-liq not supported on ${token.platform}`);
        return;
    }

    if (result.success) {
      console.log(`[Feeder] ✅ Auto Liquidity added: ${solAmount} SOL`);
      
      await logFeedHistory(token.id, "add_liquidity", result.signature || "", solAmount, undefined, result.lpTokens);
      
      await supabase
        .from("tokens")
        .update({ total_lp_added: (token.total_lp_added || 0) + solAmount })
        .eq("id", token.id);
    } else {
      console.error(`[Feeder] ❌ Auto Liquidity failed: ${result.error}`);
    }
  } catch (error: any) {
    console.error(`[Feeder] Auto-liq error:`, error.message);
  }
}

/**
 * Execute revenue share (distribute SOL to ALL token holders)
 * 1. Get all token holders
 * 2. Calculate each holder's share based on balance
 * 3. Send SOL to each holder
 */
async function executeRevenueShare(token: TokenJob, keypair: Keypair, solAmount: number) {
  try {
    // Get top token holders (up to 100)
    const holders = await getTokenHolders(token.mint, 100);
    
    if (holders.length === 0) {
      console.log(`[Feeder] No holders for revshare`);
      return;
    }

    // Calculate total supply from all holders
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    const maxHoldingPercent = 5; // Max 5% of supply to be eligible
    const maxBalance = totalSupply * (maxHoldingPercent / 100);

    // Filter out:
    // 1. The token creator/bot wallet
    // 2. Holders with 0 balance
    // 3. Whales with more than 5% of supply (anti-whale)
    const eligibleHolders = holders.filter(h => {
      if (h.address === keypair.publicKey.toBase58()) return false;
      if (h.balance <= 0) return false;
      if (h.balance > maxBalance) {
        console.log(`[Feeder] Excluded whale from revshare: ${h.address.slice(0,8)}... (${((h.balance / totalSupply) * 100).toFixed(2)}%)`);
        return false;
      }
      return true;
    });

    if (eligibleHolders.length === 0) {
      console.log(`[Feeder] No eligible holders for revshare (all excluded by whale filter)`);
      return;
    }

    // Calculate total holdings of eligible holders only
    const totalHolding = eligibleHolders.reduce((sum, h) => sum + h.balance, 0);
    console.log(`[Feeder] ${eligibleHolders.length} eligible holders (excluded whales >5%)`);
    const lamportsToDistribute = Math.floor(solAmount * LAMPORTS_PER_SOL);
    
    console.log(`[Feeder] Distributing ${solAmount} SOL to ${eligibleHolders.length} holders`);
    
    let distributedCount = 0;
    let totalDistributed = 0;
    const minShareLamports = 5000; // Minimum ~0.000005 SOL to avoid dust

    // Build transaction with multiple transfers
    const tx = new Transaction();
    
    for (const holder of eligibleHolders) {
      const share = Math.floor((holder.balance / totalHolding) * lamportsToDistribute);
      
      // Skip tiny amounts
      if (share < minShareLamports) continue;
      
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(holder.address),
          lamports: share,
        })
      );
      
      distributedCount++;
      totalDistributed += share;

      // Send batch if too many instructions (max ~20 per tx)
      if (tx.instructions.length >= 20) {
        try {
          tx.feePayer = keypair.publicKey;
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          tx.sign(keypair);
          const sig = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(sig, "confirmed");
          console.log(`[Feeder] Batch sent: ${tx.instructions.length} transfers`);
        } catch (e: any) {
          console.error(`[Feeder] Batch failed:`, e.message);
        }
        tx.instructions = [];
      }
    }

    // Send remaining
    if (tx.instructions.length > 0) {
      try {
        tx.feePayer = keypair.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(keypair);
        const sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(sig, "confirmed");
        console.log(`[Feeder] Final batch sent: ${tx.instructions.length} transfers`);
      } catch (e: any) {
        console.error(`[Feeder] Final batch failed:`, e.message);
      }
    }

    console.log(`[Feeder] ✅ Revenue Share complete: distributed to ${distributedCount} holders`);

    // Log history
    const { data: lastRound } = await supabase
      .from("revenue_share_history")
      .select("round_number")
      .eq("token_id", token.id)
      .order("round_number", { ascending: false })
      .limit(1)
      .single();

    await supabase.from("revenue_share_history").insert({
      token_id: token.id,
      round_number: (lastRound?.round_number || 0) + 1,
      total_sol: totalDistributed / LAMPORTS_PER_SOL,
      total_holders: distributedCount,
    });

    await supabase
      .from("tokens")
      .update({ total_revshare_paid: (token.total_revshare_paid || 0) + (totalDistributed / LAMPORTS_PER_SOL) })
      .eq("id", token.id);

  } catch (error: any) {
    console.error(`[Feeder] RevShare error:`, error.message);
  }
}

/**
 * Execute jackpot (ONE random holder gets ALL the SOL)
 * 1. Get all token holders
 * 2. Pick a random winner (weighted by balance for fairness)
 * 3. Send all SOL to winner
 */
async function executeJackpot(token: TokenJob, keypair: Keypair, solAmount: number) {
  try {
    // Get eligible holders
    const holders = await getTokenHolders(token.mint, 1000);
    const minHold = token.feature_jackpot_min_hold || 0;
    
    // Calculate total supply from all holders
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    const maxHoldingPercent = 5; // Max 5% of supply to be eligible
    const maxBalance = totalSupply * (maxHoldingPercent / 100);
    
    // Filter by:
    // 1. Minimum hold requirement
    // 2. Exclude bot wallet
    // 3. Exclude whales with more than 5% of supply (anti-whale)
    const eligibleHolders = holders.filter(h => {
      if (h.balance < minHold) return false;
      if (h.address === keypair.publicKey.toBase58()) return false;
      if (h.balance > maxBalance) {
        console.log(`[Feeder] Excluded whale from jackpot: ${h.address.slice(0,8)}... (${((h.balance / totalSupply) * 100).toFixed(2)}%)`);
        return false;
      }
      return true;
    });
    
    if (eligibleHolders.length === 0) {
      console.log(`[Feeder] No eligible jackpot participants (min hold: ${minHold}, max: 5% supply)`);
      return;
    }

    console.log(`[Feeder] ${eligibleHolders.length} eligible for jackpot (min hold: ${minHold}, excluded whales >5%)`);

    // Pick a random winner (weighted by balance for fairness)
    const totalWeight = eligibleHolders.reduce((sum, h) => sum + h.balance, 0);
    let random = Math.random() * totalWeight;
    let winner = eligibleHolders[0];
    
    for (const holder of eligibleHolders) {
      random -= holder.balance;
      if (random <= 0) {
        winner = holder;
        break;
      }
    }

    console.log(`[Feeder] 🎉 JACKPOT WINNER: ${winner.address}`);
    console.log(`[Feeder] Prize: ${solAmount} SOL`);

    // Send SOL to winner
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(winner.address),
        lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
      })
    );

    tx.feePayer = keypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(keypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    console.log(`[Feeder] ✅ Jackpot sent: ${signature}`);

    await logFeedHistory(token.id, "jackpot", signature, solAmount, undefined, undefined, winner.address);

    // Update jackpot entry
    await supabase.from("jackpot_entries").upsert({
      token_id: token.id,
      wallet: winner.address,
      token_balance: winner.balance,
      last_won_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "token_id,wallet" });

    await supabase
      .from("tokens")
      .update({ total_jackpot_paid: (token.total_jackpot_paid || 0) + solAmount })
      .eq("id", token.id);

  } catch (error: any) {
    console.error(`[Feeder] Jackpot error:`, error.message);
  }
}

/**
 * Get token holders from RPC/Indexer
 */
async function getTokenHolders(mint: string, limit: number): Promise<{ address: string; balance: number }[]> {
  try {
    // Try Helius API first (faster and more reliable)
    const heliusApiKey = process.env.HELIUS_API_KEY;
    
    if (heliusApiKey) {
      const response = await fetch(
        `https://api.helius.xyz/v0/token-accounts?api-key=${heliusApiKey}&mint=${mint}&limit=${limit}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return (data || []).map((acc: any) => ({
          address: acc.owner,
          balance: acc.amount || 0,
        }));
      }
    }

    // Fallback: Use RPC to get largest accounts (slower but works)
    console.log(`[Feeder] Using RPC fallback for holder data...`);
    const accounts = await connection.getTokenLargestAccounts(new PublicKey(mint));
    
    // Get owner for each account
    const holders: { address: string; balance: number }[] = [];
    
    for (const acc of accounts.value.slice(0, limit)) {
      try {
        const accInfo = await connection.getParsedAccountInfo(acc.address);
        if (accInfo.value && "parsed" in accInfo.value.data) {
          const owner = accInfo.value.data.parsed.info.owner;
          holders.push({
            address: owner,
            balance: acc.uiAmount || 0,
          });
        }
      } catch (e) {
        // Skip failed accounts
      }
    }

    return holders;

  } catch (error) {
    console.error("[Feeder] Error getting holders:", error);
    return [];
  }
}

/**
 * Log feed history to database
 */
async function logFeedHistory(
  tokenId: string,
  type: string,
  signature: string,
  solAmount?: number,
  tokenAmount?: number,
  lpTokens?: number,
  recipientWallet?: string
) {
  try {
    await supabase.from("feed_history").insert({
      token_id: tokenId,
      type,
      signature,
      sol_amount: solAmount,
      token_amount: tokenAmount,
      lp_tokens: lpTokens,
      recipient_wallet: recipientWallet,
    });
  } catch (error) {
    console.error("[Feeder] Error logging history:", error);
  }
}

export { runFeederCycle };
