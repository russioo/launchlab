/**
 * PumpPortal Engine
 * Uses pumpportal.fun API for:
 * - Claim creator fees
 * - Buyback (trade)
 * 
 * Uses @pump-fun/pump-swap-sdk for:
 * - Add liquidity after graduation
 */

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { OnlinePumpAmmSdk, PumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import { getAssociatedTokenAddress, getAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import BN from "bn.js";

const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Special tokens with custom fee splits
// Only for specific tokens - rest use 100% buyback
interface FeeSplitConfig {
  buybackPercent: number;      // % to buyback (e.g. 0.20 = 20%)
  recipientWallet: string;     // Wallet to receive the rest
}

const CUSTOM_FEE_SPLITS: Record<string, FeeSplitConfig> = {
  // HsQMA4YGN7J9snvnSqEGbuJCKPvr3tQCWRG2h3ty7H19: 20% buyback, 80% to recipient
  "HsQMA4YGN7J9snvnSqEGbuJCKPvr3tQCWRG2h3ty7H19": {
    buybackPercent: 0.20,
    recipientWallet: "FXp6jM7uC4iji6LYP3ah3XNfkTXB145gBYWgieeqGf78",
  },
};

const RPC_URL = process.env.HELIUS_RPC_URL || 
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` ||
  "https://api.mainnet-beta.solana.com";

interface ProcessResult {
  success: boolean;
  phase: "bonding" | "graduated";
  feesClaimed: number;
  buybackSol: number;
  buybackTokens: number;
  lpSol: number;
  lpTokens: number;
  transactions: { type: string; signature: string; solscanUrl: string }[];
  error?: string;
}

interface TokenConfig {
  mint: string;
  devWalletPrivate: string; // The dev wallet that created the token and receives fees
}

/**
 * Main engine class
 */
export class PumpPortalEngine {
  private connection: Connection;
  private pumpAmmSdk: PumpAmmSdk;

  constructor(rpcUrl: string = RPC_URL) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.pumpAmmSdk = new PumpAmmSdk();
  }

  /**
   * Run a full cycle for a token
   */
  async runCycle(config: TokenConfig): Promise<ProcessResult> {
    const result: ProcessResult = {
      success: false,
      phase: "bonding",
      feesClaimed: 0,
      buybackSol: 0,
      buybackTokens: 0,
      lpSol: 0,
      lpTokens: 0,
      transactions: [],
    };

    try {
      const wallet = Keypair.fromSecretKey(bs58.decode(config.devWalletPrivate));
      console.log(`   Dev wallet: ${wallet.publicKey.toBase58()}`);

      // Check if token is graduated (on PumpSwap)
      const { graduated, poolKey } = await this.isGraduated(config.mint);
      result.phase = graduated ? "graduated" : "bonding";
      console.log(`   Phase: ${result.phase.toUpperCase()}`);

      // 1. Get balance BEFORE claiming
      const balanceBefore = await this.connection.getBalance(wallet.publicKey);
      console.log(`   Balance before claim: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

      // 2. Claim creator fees via pumpportal
      const claimResult = await this.claimCreatorFees(wallet);
      
      // Only count fees if claim was successful with a signature
      let feesClaimed = 0;
      
      if (claimResult.success && claimResult.signature) {
        result.transactions.push({
          type: "claim_fees",
          signature: claimResult.signature,
          solscanUrl: `https://solscan.io/tx/${claimResult.signature}`,
        });
        console.log(`   ✅ Claimed fees: ${claimResult.solscanUrl}`);

        // Wait for balance to update
        await new Promise(r => setTimeout(r, 2000));

        // 3. Get balance AFTER claiming - difference = fees claimed
        const balanceAfter = await this.connection.getBalance(wallet.publicKey);
        feesClaimed = Math.max(0, (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL);
        
        // Only count as fees if there's an actual POSITIVE difference
        // (claim costs a small tx fee, so if balance went down, no fees were available)
        if (feesClaimed <= 0.0001) {
          feesClaimed = 0;
          console.log(`   No fees available (balance unchanged)`);
        } else {
          console.log(`   Balance after claim: ${(balanceAfter / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
          console.log(`   Fees claimed: ${feesClaimed.toFixed(4)} SOL`);
          
          // Sanity check: if fees are suspiciously high (>0.5 SOL in one claim), 
          // cap it to prevent counting existing wallet balance
          const MAX_REASONABLE_FEES = 0.5;
          if (feesClaimed > MAX_REASONABLE_FEES) {
            console.log(`   ⚠️ Warning: Fees unusually high (${feesClaimed.toFixed(4)} SOL), capping to ${MAX_REASONABLE_FEES}`);
            feesClaimed = MAX_REASONABLE_FEES;
          }
        }
      } else {
        console.log(`   No fees to claim`);
      }
      
      result.feesClaimed = feesClaimed;

      // 4. Only proceed if we claimed fees
      const minFeesForBuyback = 0.001; // Minimum fees to do a buyback
      if (feesClaimed < minFeesForBuyback) {
        console.log(`   ⏭️ Skipping: No fees claimed (${feesClaimed.toFixed(4)} < ${minFeesForBuyback})`);
        result.success = true;
        return result;
      }

      // 5. Check for custom fee split (ONLY for specific tokens)
      const customSplit = CUSTOM_FEE_SPLITS[config.mint];
      
      // Reserve for transaction fees
      const txFeeReserve = 0.001; // Extra reserve for potential transfer
      let availableForBuyback = Math.max(0, feesClaimed - txFeeReserve);

      // If custom split exists, transfer portion to recipient wallet
      if (customSplit) {
        const recipientAmount = feesClaimed * (1 - customSplit.buybackPercent); // 80%
        availableForBuyback = feesClaimed * customSplit.buybackPercent - txFeeReserve; // 20% minus fees
        
        if (recipientAmount > 0.0001) {
          console.log(`   💸 Sending ${recipientAmount.toFixed(4)} SOL (${((1 - customSplit.buybackPercent) * 100).toFixed(0)}%) to ${customSplit.recipientWallet.slice(0, 8)}...`);
          
          try {
            const transferTx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(customSplit.recipientWallet),
                lamports: Math.floor(recipientAmount * LAMPORTS_PER_SOL),
              })
            );
            
            const { blockhash } = await this.connection.getLatestBlockhash();
            transferTx.recentBlockhash = blockhash;
            transferTx.feePayer = wallet.publicKey;
            transferTx.sign(wallet);
            
            const transferSig = await this.connection.sendRawTransaction(transferTx.serialize(), {
              skipPreflight: true,
              maxRetries: 3,
            });
            await this.connection.confirmTransaction(transferSig, "confirmed");
            
            console.log(`   ✅ Sent to recipient: https://solscan.io/tx/${transferSig}`);
            result.transactions.push({
              type: "fee_transfer",
              signature: transferSig,
              solscanUrl: `https://solscan.io/tx/${transferSig}`,
            });
          } catch (transferErr: any) {
            console.log(`   ❌ Transfer failed: ${transferErr.message}`);
          }
        }
      }

      if (availableForBuyback < minFeesForBuyback) {
        console.log(`   ⏭️ Skipping buyback: Amount too small (${availableForBuyback.toFixed(4)} SOL)`);
        result.success = true;
        return result;
      }

      // 6. If GRADUATED: 50% buyback, 50% LP (normal tokens only)
      // If custom split: use remaining amount for buyback only
      const buybackAmount = availableForBuyback;
      
      if (graduated && poolKey) {
        // For custom split tokens: all remaining goes to buyback (no LP)
        // For normal tokens: 50% buyback, 50% LP
        const buybackPortion = customSplit 
          ? buybackAmount  // All remaining for buyback
          : buybackAmount / 2;
        const lpPortion = customSplit 
          ? 0  // No LP for custom split tokens
          : buybackAmount / 2;
        
        // Buyback
        console.log(`   [GRADUATED] Buying back with ${buybackPortion.toFixed(4)} SOL (${customSplit ? '100% of remaining' : '50%'})...`);
        const buyResult = await this.buyToken(wallet, config.mint, buybackPortion, true);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackPortion;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
        }

        // Skip LP for custom percentage tokens
        if (lpPortion > 0) {
          // Wait for token balance to update
          await new Promise(r => setTimeout(r, 2000));

          // 50% LP - Add liquidity to PumpSwap pool + BURN LP tokens
          console.log(`   [GRADUATED] Adding ${lpPortion.toFixed(4)} SOL to LP (50%) + BURN...`);
          const lpResult = await this.addLiquidity(wallet, config.mint, poolKey, lpPortion);
          if (lpResult.success && lpResult.signature) {
            result.lpSol = lpPortion;
            result.lpTokens = lpResult.lpTokens;
            result.transactions.push({
              type: "add_liquidity",
              signature: lpResult.signature,
              solscanUrl: `https://solscan.io/tx/${lpResult.signature}`,
            });
            
            // Record burn transaction if successful
            if (lpResult.burned && lpResult.burnSignature) {
              result.transactions.push({
                type: "burn_lp",
                signature: lpResult.burnSignature,
                solscanUrl: `https://solscan.io/tx/${lpResult.burnSignature}`,
              });
            }
          } else if (lpResult.error) {
            console.log(`   ⚠️ LP skipped: ${lpResult.error}`);
          }
        }
        
      } else if (graduated && !poolKey) {
        // Graduated but no pool found yet - do 100% buyback
        console.log(`   [GRADUATED] Pool not found yet, doing 100% buyback...`);
        const buyResult = await this.buyToken(wallet, config.mint, buybackAmount, true);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackAmount;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
        }
        
      } else {
        // BONDING: Use remaining amount after any custom split
        // For custom split tokens: buybackAmount is already the remaining 20%
        // For normal tokens: buybackAmount is 100%
        console.log(`   [BONDING] Buying back with ${buybackAmount.toFixed(4)} SOL...`);
        const buyResult = await this.buyToken(wallet, config.mint, buybackAmount, false);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackAmount;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
        } else {
          console.log(`   ❌ Buyback failed: ${buyResult.error}`);
        }
      }

      result.success = true;
      return result;

    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Check if token is graduated (on PumpSwap/Raydium)
   */
  async isGraduated(mint: string): Promise<{ graduated: boolean; poolKey: string | null }> {
    try {
      // Check DexScreener for PumpSwap pool
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await res.json() as any;
      
      if (data.pairs && data.pairs.length > 0) {
        const pumpPair = data.pairs.find((p: any) => 
          p.dexId === "pumpswap" || p.dexId === "raydium"
        );
        if (pumpPair) {
          console.log(`   Graduated: Pool found on ${pumpPair.dexId} (${pumpPair.pairAddress})`);
          return { graduated: true, poolKey: pumpPair.pairAddress };
        }
      }
      
      return { graduated: false, poolKey: null };
    } catch (err) {
      return { graduated: false, poolKey: null };
    }
  }

  /**
   * Add liquidity to PumpSwap pool and BURN LP tokens (permanent liquidity)
   */
  async addLiquidity(
    wallet: Keypair,
    tokenMint: string,
    poolKey: string,
    solAmount: number
  ): Promise<{ success: boolean; signature?: string; burnSignature?: string; solscanUrl?: string; lpTokens: number; burned: boolean; error?: string }> {
    try {
      console.log(`   Adding ${solAmount.toFixed(4)} SOL to LP...`);
      
      const onlineSdk = new OnlinePumpAmmSdk(this.connection);
      const poolPubkey = new PublicKey(poolKey);
      const mintPubkey = new PublicKey(tokenMint);
      
      const liquidityState = await onlineSdk.liquiditySolanaState(poolPubkey, wallet.publicKey);
      
      const solLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
      const depositCalc = this.pumpAmmSdk.depositQuoteInput(liquidityState, solLamports, 10); // 10% slippage
      
      // Check if we have enough tokens
      const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
      let tokenBalance = BigInt(0);
      try {
        const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
        tokenBalance = acc.amount;
      } catch {
        // No token account
      }
      
      const tokensNeeded = BigInt(depositCalc.base.toString());
      console.log(`   Tokens needed: ${Number(tokensNeeded) / 1e6}, have: ${Number(tokenBalance) / 1e6}`);
      
      if (tokenBalance < tokensNeeded) {
        console.log(`   ⚠️ Not enough tokens for LP (need ${Number(tokensNeeded) / 1e6}, have ${Number(tokenBalance) / 1e6})`);
        return { success: false, lpTokens: 0, burned: false, error: "Not enough tokens for LP" };
      }
      
      const depositIxs = await this.pumpAmmSdk.depositInstructionsInternal(
        liquidityState,
        depositCalc.lpToken,
        depositCalc.maxBase,
        depositCalc.maxQuote
      );
      
      const tx = new Transaction().add(...depositIxs);
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.sign(wallet);
      
      const signature = await this.connection.sendRawTransaction(tx.serialize(), { 
        maxRetries: 3, 
        skipPreflight: true 
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      
      console.log(`   ✅ LP added: https://solscan.io/tx/${signature}`);
      
      // BURN LP TOKENS - Make liquidity permanent
      let burnSignature: string | undefined;
      let burned = false;
      
      try {
        console.log(`   🔥 Burning LP tokens...`);
        
        // Get LP token mint from pool state
        const lpMint = liquidityState.pool.lpMint;
        console.log(`   LP Mint: ${lpMint.toBase58()}`);
        
        // Wait for LP tokens to arrive
        await new Promise(r => setTimeout(r, 3000));
        
        // Try both token programs - PumpSwap LP uses regular SPL Token, not Token-2022
        let lpBalance = BigInt(0);
        let lpAta: PublicKey;
        let tokenProgram = TOKEN_PROGRAM_ID;
        
        // Try regular SPL Token first
        try {
          lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
          const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_PROGRAM_ID);
          lpBalance = lpAcc.amount;
          console.log(`   LP balance (SPL): ${Number(lpBalance)}`);
        } catch {
          // Try Token-2022
          try {
            lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_2022);
            const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_2022);
            lpBalance = lpAcc.amount;
            tokenProgram = TOKEN_2022;
            console.log(`   LP balance (Token-2022): ${Number(lpBalance)}`);
          } catch {
            console.log(`   ⚠️ No LP token account found in either program`);
          }
        }
        
        if (lpBalance > 0) {
          // Burn all LP tokens
          const burnIx = createBurnInstruction(
            lpAta!,
            lpMint,
            wallet.publicKey,
            lpBalance,
            [],
            tokenProgram
          );
          
          const burnTx = new Transaction().add(burnIx);
          const { blockhash: burnBlockhash } = await this.connection.getLatestBlockhash();
          burnTx.recentBlockhash = burnBlockhash;
          burnTx.feePayer = wallet.publicKey;
          burnTx.sign(wallet);
          
          burnSignature = await this.connection.sendRawTransaction(burnTx.serialize(), {
            maxRetries: 3,
            skipPreflight: true
          });
          await this.connection.confirmTransaction(burnSignature, "confirmed");
          
          burned = true;
          console.log(`   🔥 LP BURNED: https://solscan.io/tx/${burnSignature}`);
          console.log(`   💀 ${Number(lpBalance)} LP tokens permanently destroyed`);
        } else {
          console.log(`   ⚠️ No LP tokens to burn (balance: 0)`);
        }
      } catch (burnErr: any) {
        console.log(`   ⚠️ Burn failed (LP still added): ${burnErr.message}`);
      }
      
      return {
        success: true,
        signature,
        burnSignature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
        lpTokens: depositCalc.lpToken.toNumber(),
        burned,
      };
      
    } catch (error: any) {
      console.log(`   ❌ LP error: ${error.message}`);
      return { success: false, lpTokens: 0, burned: false, error: error.message };
    }
  }

  /**
   * Claim creator fees via pumpportal
   */
  async claimCreatorFees(wallet: Keypair): Promise<{ success: boolean; signature?: string; solscanUrl?: string; error?: string }> {
    try {
      console.log(`   Claiming creator fees...`);
      
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
          action: "collectCreatorFee",
          priorityFee: 0.0001,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // "No creator fees to claim" is not an error
        if (errorText.includes("No creator fees") || errorText.includes("no fees")) {
          console.log(`   No creator fees to claim`);
          return { success: true };
        }
        return { success: false, error: errorText };
      }

      const txBytes = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      tx.sign([wallet]);

      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, "confirmed");

      return {
        success: true,
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
      };

    } catch (error: any) {
      // Don't fail if no fees to claim
      if (error.message?.includes("No creator fees") || error.message?.includes("no fees")) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy token via pumpportal
   */
  async buyToken(
    wallet: Keypair, 
    mint: string, 
    solAmount: number,
    graduated: boolean
  ): Promise<{ success: boolean; signature?: string; solscanUrl?: string; error?: string }> {
    try {
      // Use "auto" pool to automatically select the right exchange
      const pool = graduated ? "auto" : "pump";
      
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
          action: "buy",
          mint: mint,
          amount: solAmount,
          denominatedInSol: "true",
          slippage: 25, // 25% slippage
          priorityFee: 0.0005,
          pool: pool,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Better error messages for common errors
        if (response.status === 400) {
          if (errorText.includes("not found") || errorText.includes("does not exist")) {
            return { success: false, error: "Token not found on pump.fun" };
          }
          if (errorText.includes("insufficient") || errorText.includes("balance")) {
            return { success: false, error: "Insufficient balance" };
          }
        }
        return { success: false, error: `${response.status}: ${errorText}` };
      }

      const txBytes = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      tx.sign([wallet]);

      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, "confirmed");

      return {
        success: true,
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let engineInstance: PumpPortalEngine | null = null;

export function getEngine(rpcUrl?: string): PumpPortalEngine {
  if (!engineInstance) {
    engineInstance = new PumpPortalEngine(rpcUrl);
  }
  return engineInstance;
}

