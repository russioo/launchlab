/**
 * Liquidity Feeder
 * Fetches active tokens from database and runs cycles
 */

import { supabase } from "../index";
import { getEngine } from "./pumpportalEngine";

interface TokenRecord {
  id: string;
  name: string;
  symbol: string;
  mint: string;
  creator_wallet: string;
  bot_wallet_private: string;
  status: string;
}

/**
 * Process all active tokens
 */
export async function processAllTokens(): Promise<void> {
  console.log("📋 Fetching active tokens from database...");

  // Only process tokens that are actually live on pump.fun
  // DO NOT process "pending" tokens - they haven't been confirmed yet!
  const { data: tokens, error } = await supabase
    .from("tokens")
    .select("id, name, symbol, mint, creator_wallet, bot_wallet_private, status")
    .in("status", ["bonding", "live", "graduating"])
    .not("mint", "is", null);

  if (error) {
    console.error("Database error:", error);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log("No active tokens to process");
    return;
  }

  console.log(`Found ${tokens.length} active token(s)`);

  const engine = getEngine();

  for (const token of tokens as TokenRecord[]) {
    console.log("");
    console.log("──────────────────────────────────────────────────");
    console.log(`🪙 Processing: ${token.symbol} (${token.mint.slice(0, 8)}...)`);

    // Skip if no bot wallet configured
    if (!token.bot_wallet_private) {
      console.log("   ⏭️ Skipping: No bot wallet configured");
      continue;
    }

    // Skip if no mint address (shouldn't happen with our query, but safety check)
    if (!token.mint) {
      console.log("   ⏭️ Skipping: No mint address");
      continue;
    }

    try {
      const result = await engine.runCycle({
        mint: token.mint,
        devWalletPrivate: token.bot_wallet_private,
      });

      console.log(`📊 Phase: ${result.phase.toUpperCase()}`);
      
      if (result.feesClaimed > 0) {
        console.log(`   💰 Fees claimed: ${result.feesClaimed.toFixed(4)} SOL`);
      }
      
      if (result.buybackSol > 0) {
        console.log(`   💰 Buyback: ${result.buybackSol.toFixed(4)} SOL`);
      }

      // Show transaction links
      for (const tx of result.transactions) {
        console.log(`   ✅ ${tx.type}: ${tx.solscanUrl}`);
      }

      if (result.error && !result.success) {
        console.log(`   ❌ Error: ${result.error}`);
      }

      // Update token stats and status
      const updates: Record<string, unknown> = {
        last_feed_at: new Date().toISOString(),
      };

      // Update status if graduated (use "live" as the graduated status for dashboard)
      if (result.phase === "graduated" && token.status !== "live") {
        updates.status = "live";
        updates.graduated_at = new Date().toISOString();
        console.log(`   📈 Status updated to: live (graduated)`);
      }

      // Update aggregate stats using raw SQL increment
      if (result.feesClaimed > 0 || result.buybackSol > 0 || result.lpSol > 0) {
        const { error: updateError } = await supabase.rpc('increment_token_stats', {
          p_token_id: token.id,
          p_fees: result.feesClaimed,
          p_buyback: result.buybackSol,
          p_lp: result.lpSol,
        });

        if (updateError) {
          // Fallback: direct update (less accurate but works)
          console.log(`   ⚠️ RPC not available, using direct update`);
          const { data: currentToken } = await supabase
            .from("tokens")
            .select("total_fees_claimed, total_buyback, total_lp_added")
            .eq("id", token.id)
            .single();

          if (currentToken) {
            updates.total_fees_claimed = (Number(currentToken.total_fees_claimed) || 0) + result.feesClaimed;
            updates.total_buyback = (Number(currentToken.total_buyback) || 0) + result.buybackSol;
            updates.total_lp_added = (Number(currentToken.total_lp_added) || 0) + result.lpSol;
          }
        }
      }

      // Apply updates
      await supabase
        .from("tokens")
        .update(updates)
        .eq("id", token.id);

      // Record transactions in feed_history with correct amounts per type
      for (const tx of result.transactions) {
        let solAmount = 0;
        
        switch (tx.type) {
          case "claim_fees":
            solAmount = result.feesClaimed;
            break;
          case "buyback":
            solAmount = result.buybackSol;
            break;
          case "add_liquidity":
            solAmount = result.lpSol;
            break;
          case "fee_transfer":
            // For custom split tokens - calculate the transferred amount
            solAmount = result.feesClaimed * 0.80; // 80% transferred
            break;
          default:
            solAmount = 0;
        }

        await supabase.from("feed_history").insert({
          token_id: token.id,
          type: tx.type,
          signature: tx.signature,
          sol_amount: solAmount,
          token_amount: 0,
        });
        
        console.log(`   📝 Recorded: ${tx.type} = ${solAmount.toFixed(4)} SOL`);
      }

    } catch (err: any) {
      console.error(`   ❌ Error:`, err.message);
      
      // If error suggests token doesn't exist, consider marking it
      if (err.message?.includes("Bad Request") || err.message?.includes("not found")) {
        console.log(`   ⚠️ Token may not exist on pump.fun - consider checking`);
      }
    }
  }

  console.log("");
  console.log("──────────────────────────────────────────────────");
  console.log("✅ All tokens processed");
}
